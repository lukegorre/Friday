'use strict'

const { spawn } = require('child_process')

// Audio + system control via Core Audio API (C#/COM), compiled once at startup.
const INIT_SCRIPT = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
using Microsoft.Win32;

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorCOM {}

[ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
interface IMMDeviceEnumerator {
    void NotImpl1();
    [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
}

[ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("D666063F-1587-4E43-81F1-B948E807363F")]
interface IMMDevice {
    [PreserveSig] int Activate(ref Guid id, int clsCtx, IntPtr activationParams, out IAudioEndpointVolume aev);
    void NotImpl1();
    void NotImpl2();
}

[ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("5CDF2C82-841E-4546-9722-0CF74078229A")]
interface IAudioEndpointVolume {
    void NotImpl1();  // RegisterControlChangeNotify
    void NotImpl2();  // UnregisterControlChangeNotify
    void NotImpl3();  // GetChannelCount
    void NotImpl4();  // SetMasterVolumeLevel (dB)
    [PreserveSig] int SetMasterVolumeLevelScalar(float level, Guid ctx);
    void NotImpl5();  // GetMasterVolumeLevel (dB)
    [PreserveSig] int GetMasterVolumeLevelScalar(out float level);
    void NotImpl6();  // SetChannelVolumeLevel
    void NotImpl7();  // SetChannelVolumeLevelScalar
    void NotImpl8();  // GetChannelVolumeLevel
    void NotImpl9();  // GetChannelVolumeLevelScalar
    [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool muted, Guid ctx);
    [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool muted);
}

public static class AudioManager {
    private static IAudioEndpointVolume GetAEV() {
        var en = (IMMDeviceEnumerator)(new MMDeviceEnumeratorCOM());
        IMMDevice dev; en.GetDefaultAudioEndpoint(0, 1, out dev);
        Guid g = typeof(IAudioEndpointVolume).GUID;
        IAudioEndpointVolume aev; dev.Activate(ref g, 1, IntPtr.Zero, out aev);
        return aev;
    }
    public static float GetVolume() { float v; GetAEV().GetMasterVolumeLevelScalar(out v); return v; }
    public static void SetVolume(float v) { GetAEV().SetMasterVolumeLevelScalar(Math.Max(0f,Math.Min(1f,v)), Guid.Empty); }
    public static bool GetMute() { bool m; GetAEV().GetMute(out m); return m; }
    public static void ToggleMute() { var a=GetAEV(); bool m; a.GetMute(out m); a.SetMute(!m, Guid.Empty); }
}

public static class MediaKey {
    [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, IntPtr extra);
    public static void Send(byte vk) { keybd_event(vk,0,0,IntPtr.Zero); keybd_event(vk,0,2,IntPtr.Zero); }
}

public static class NightModeHelper {
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, IntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out IntPtr pdwResult);

    const string KEY = @"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CloudStore\\Store\\DefaultAccount\\Current\\default$windows.data.bluelightreduction.bluelightreductionstate\\windows.data.bluelightreduction.bluelightreductionstate";

    public static string Toggle() {
        using (var key = Registry.CurrentUser.OpenSubKey(KEY, writable: true)) {
            if (key == null) return "KEY_NOT_FOUND";
            byte[] data = (byte[])key.GetValue("Data");
            if (data == null || data.Length <= 24) return "DATA_TOO_SHORT:" + (data == null ? 0 : data.Length);
            bool isOn = data[24] == 19;
            if (isOn) { data[24] = 0; data[23] = 16; } else { data[24] = 19; data[23] = 19; }
            key.SetValue("Data", data, RegistryValueKind.Binary);
        }
        IntPtr res;
        SendMessageTimeout(new IntPtr(0xFFFF), 0x001A, IntPtr.Zero, "ImmersiveColorSet", 2, 5000, out res);
        return "OK";
    }
}
'@ -Language CSharp -ErrorAction Stop
Write-Host '__READY__'
`

class PowerShellRunner {
  constructor() {
    this._proc    = null
    this._queue   = []
    this._current = null
    this._stdoutBuf = ''
    this._outputBuf = ''
    this._ready   = false
    this._readyResolve = null
  }

  start() {
    return new Promise((resolve, reject) => {
      this._readyResolve = resolve

      this._proc = spawn('powershell', [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-NoExit', '-Command', '-'
      ], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })

      this._proc.stdout.on('data', (data) => {
        this._stdoutBuf += data.toString()
        const lines = this._stdoutBuf.split('\n')
        this._stdoutBuf = lines.pop() // keep incomplete line

        for (const raw of lines) {
          const line = raw.trimEnd()
          if (line === '__READY__') {
            this._ready = true
            if (this._readyResolve) { this._readyResolve(); this._readyResolve = null }
            this._processQueue()
          } else if (line === '__END__') {
            if (this._current) {
              const out = this._outputBuf.trim()
              this._outputBuf = ''
              this._current.resolve(out)
              this._current = null
              this._processQueue()
            }
          } else {
            this._outputBuf += line + '\n'
          }
        }
      })

      this._proc.stderr.on('data', (data) => {
        if (this._current) {
          const err = data.toString().trim()
          this._outputBuf = ''
          this._current.reject(new Error(err))
          this._current = null
          this._processQueue()
        }
      })

      this._proc.on('exit', () => {
        this._ready = false
        this._proc = null
      })

      this._proc.stdin.write(INIT_SCRIPT + '\n')
    })
  }

  run(command) {
    return new Promise((resolve, reject) => {
      if (!this._ready) { resolve(''); return }
      this._queue.push({ command, resolve, reject })
      if (!this._current) this._processQueue()
    })
  }

  _processQueue() {
    if (!this._ready || this._current || this._queue.length === 0) return
    this._current = this._queue.shift()
    this._proc.stdin.write(this._current.command + "\nWrite-Host '__END__'\n")
  }

  stop() {
    if (this._proc) {
      try { this._proc.stdin.end() } catch (_) {}
      this._proc = null
      this._ready = false
    }
  }
}

const runner = new PowerShellRunner()
module.exports = runner
