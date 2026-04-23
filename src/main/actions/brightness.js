'use strict'

const psRunner = require('../ps-runner')

const SETUP = `
if (-not ([System.Management.Automation.PSTypeName]'BrightnessMgr').Type) {
Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class BrightnessMgr {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    struct PHYSICAL_MONITOR {
        public IntPtr hPhysicalMonitor;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
        public string szPhysicalMonitorDescription;
    }
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint dwFlags);
    [DllImport("dxva2.dll")] static extern bool GetNumberOfPhysicalMonitorsFromHMONITOR(IntPtr hMonitor, out uint pdwNumberOfPhysicalMonitors);
    [DllImport("dxva2.dll")] static extern bool GetPhysicalMonitorsFromHMONITOR(IntPtr hMonitor, uint dwPhysicalMonitorArraySize, [Out] PHYSICAL_MONITOR[] pPhysicalMonitorArray);
    [DllImport("dxva2.dll")] static extern bool DestroyPhysicalMonitor(IntPtr hMonitor);
    [DllImport("dxva2.dll")] static extern bool GetMonitorBrightness(IntPtr hMonitor, out uint pdwMinimumBrightness, out uint pdwCurrentBrightness, out uint pdwMaximumBrightness);
    [DllImport("dxva2.dll")] static extern bool SetMonitorBrightness(IntPtr hMonitor, uint dwNewBrightness);

    static PHYSICAL_MONITOR[] GetPhysMons() {
        IntPtr hMon = MonitorFromWindow(GetForegroundWindow(), 2);
        uint count;
        if (!GetNumberOfPhysicalMonitorsFromHMONITOR(hMon, out count) || count == 0) return new PHYSICAL_MONITOR[0];
        var mons = new PHYSICAL_MONITOR[count];
        return GetPhysicalMonitorsFromHMONITOR(hMon, count, mons) ? mons : new PHYSICAL_MONITOR[0];
    }

    static void Destroy(PHYSICAL_MONITOR[] mons) {
        for (int i = 0; i < mons.Length; i++) DestroyPhysicalMonitor(mons[i].hPhysicalMonitor);
    }

    public static int GetBrightness() {
        var mons = GetPhysMons();
        if (mons.Length == 0) return -1;
        uint min, cur, max;
        bool ok = GetMonitorBrightness(mons[0].hPhysicalMonitor, out min, out cur, out max);
        Destroy(mons);
        if (!ok || max == min) return -1;
        return (int)Math.Round((cur - min) * 100.0 / (max - min));
    }

    public static void AdjustBrightness(int delta) {
        var mons = GetPhysMons();
        if (mons.Length == 0) return;
        uint min, cur, max;
        if (GetMonitorBrightness(mons[0].hPhysicalMonitor, out min, out cur, out max) && max != min) {
            int pct = (int)Math.Round((cur - min) * 100.0 / (max - min));
            int np  = Math.Max(0, Math.Min(100, pct + delta));
            SetMonitorBrightness(mons[0].hPhysicalMonitor, (uint)(min + (max - min) * np / 100));
        }
        Destroy(mons);
    }
}
'@ -Language CSharp -ErrorAction Stop
}
`

let _setupDone = false
async function ensureSetup() {
  if (_setupDone) return
  try {
    await psRunner.run(SETUP)
    _setupDone = true
  } catch (err) {
    console.error('[BrightnessMgr] setup failed:', err.message)
    throw err
  }
}

async function run(cmd) {
  await ensureSetup()
  return psRunner.run(cmd)
}

async function getBrightness() {
  try {
    const raw = await run('[BrightnessMgr]::GetBrightness()')
    const v = parseInt(raw, 10)
    return isNaN(v) || v < 0 ? null : v
  } catch (_) { return null }
}

module.exports = {
  getBrightness,
  brightnessUp:   () => run('[BrightnessMgr]::AdjustBrightness(10)').catch(() => null),
  brightnessDown: () => run('[BrightnessMgr]::AdjustBrightness(-10)').catch(() => null),
}
