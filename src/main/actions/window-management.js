'use strict'

const psRunner = require('../ps-runner')

// All window operations via Win32 API compiled into the persistent PS session.
// No WinForms dependency — screen dimensions come from GetMonitorInfo.
const WIN32_SETUP = `
if (-not ([System.Management.Automation.PSTypeName]'WinMgr').Type) {
Add-Type @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Text;

public static class WinMgr {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int W, int H, bool repaint);
    [DllImport("user32.dll")] public static extern int  GetWindowLong(IntPtr hWnd, int nIndex);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int  GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int  GetWindowText(IntPtr hWnd, StringBuilder sb, int n);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] static extern IntPtr GetTopWindow(IntPtr hWnd);
    [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);
    [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr hWnd, uint dwFlags);
    [DllImport("user32.dll")] public static extern IntPtr MonitorFromPoint(POINT pt, uint dwFlags);
    [DllImport("user32.dll")] public static extern bool GetMonitorInfo(IntPtr hMon, ref MONITORINFO mi);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")] static extern int GetSystemMetrics(int nIndex);
    [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, IntPtr extra);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT { public int x, y; }

    [StructLayout(LayoutKind.Sequential)]
    public struct MONITORINFO {
        public int  cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public uint dwFlags;
    }

    const int  SW_SHOW       = 5;
    const int  SW_MAXIMIZE   = 3;
    const int  SW_RESTORE    = 9;
    const int  SW_MINIMIZE   = 6;
    const int  GWL_STYLE     = -16;
    const int  GWL_EXSTYLE   = -20;
    const int  WS_MAXIMIZE   = 0x01000000;
    const int  WS_EX_TOOLWINDOW = 0x00000080;
    const int  WS_EX_NOACTIVATE = 0x08000000;
    const uint MONITOR_DEFAULTTONEAREST = 2;

    public static void MaximizeToggle() {
        var hWnd = GetForegroundWindow();
        int style = GetWindowLong(hWnd, GWL_STYLE);
        ShowWindow(hWnd, (style & WS_MAXIMIZE) != 0 ? SW_RESTORE : SW_MAXIMIZE);
    }

    public static void Minimize() { ShowWindow(GetForegroundWindow(), SW_MINIMIZE); }

    public static void Close() {
        PostMessage(GetForegroundWindow(), 0x0010, IntPtr.Zero, IntPtr.Zero);
    }

    public static void ForceQuit() {
        var hWnd = GetForegroundWindow();
        uint pid; GetWindowThreadProcessId(hWnd, out pid);
        try { Process.GetProcessById((int)pid).Kill(); } catch {}
    }

    static List<IntPtr> GetAppWindows() {
        var list = new List<IntPtr>();
        IntPtr hWnd = GetTopWindow(IntPtr.Zero);
        while (hWnd != IntPtr.Zero) {
            if (IsWindowVisible(hWnd) && GetWindowTextLength(hWnd) > 0) {
                int ex = GetWindowLong(hWnd, GWL_EXSTYLE);
                if ((ex & WS_EX_TOOLWINDOW) == 0 && (ex & WS_EX_NOACTIVATE) == 0) {
                    list.Add(hWnd);
                }
            }
            hWnd = GetWindow(hWnd, 2); // GW_HWNDNEXT
        }
        return list;
    }

    // SetForegroundWindow requires the caller to own foreground rights.
    // AttachThreadInput borrows the current foreground thread's rights so the
    // call is accepted even though our PowerShell process runs in the background.
    static void Activate(IntPtr hWnd) {
        uint unused;
        uint fgTid  = GetWindowThreadProcessId(GetForegroundWindow(), out unused);
        uint myTid  = GetCurrentThreadId();
        bool attach = fgTid != myTid && fgTid != 0;
        if (attach) AttachThreadInput(myTid, fgTid, true);

        if (IsIconic(hWnd)) ShowWindow(hWnd, SW_RESTORE);
        else ShowWindow(hWnd, SW_SHOW);
        SetForegroundWindow(hWnd);
        BringWindowToTop(hWnd);

        if (attach) AttachThreadInput(myTid, fgTid, false);
    }

    public static void AppForward() {
        var wins = GetAppWindows();
        if (wins.Count < 2) return;
        var cur = GetForegroundWindow();
        int idx = wins.IndexOf(cur);
        Activate(wins[(idx + 1) % wins.Count]);
    }

    public static void AppBack() {
        var wins = GetAppWindows();
        if (wins.Count < 2) return;
        var cur = GetForegroundWindow();
        int idx = wins.IndexOf(cur);
        Activate(wins[(idx - 1 + wins.Count) % wins.Count]);
    }

    static RECT GetWorkArea() {
        var mi = new MONITORINFO();
        mi.cbSize = 40; // sizeof: 4 + 16 + 16 + 4
        GetMonitorInfo(MonitorFromWindow(GetForegroundWindow(), MONITOR_DEFAULTTONEAREST), ref mi);
        return mi.rcWork;
    }

    public static void SnapLeft() {
        var wa = GetWorkArea();
        var hWnd = GetForegroundWindow();
        ShowWindow(hWnd, SW_RESTORE);
        System.Threading.Thread.Sleep(40);
        MoveWindow(hWnd, wa.Left, wa.Top, (wa.Right - wa.Left) / 2, wa.Bottom - wa.Top, true);
    }

    public static void SnapRight() {
        var wa = GetWorkArea();
        var hWnd = GetForegroundWindow();
        int half = (wa.Right - wa.Left) / 2;
        ShowWindow(hWnd, SW_RESTORE);
        System.Threading.Thread.Sleep(40);
        MoveWindow(hWnd, wa.Left + half, wa.Top, half, wa.Bottom - wa.Top, true);
    }

    static void Down(byte vk) { keybd_event(vk, 0, 0, IntPtr.Zero); }
    static void Up(byte vk)   { keybd_event(vk, 0, 2, IntPtr.Zero); }

    // Win+Tab = Task View
    public static void TaskView() {
        Down(0x5B); Down(0x09); Up(0x09); Up(0x5B);
    }

    // Win+D = Show/Hide Desktop
    public static void ShowDesktop() {
        Down(0x5B); Down(0x44); Up(0x44); Up(0x5B);
    }

    static MONITORINFO GetMonInfo(IntPtr hMon) {
        var mi = new MONITORINFO(); mi.cbSize = 40;
        GetMonitorInfo(hMon, ref mi);
        return mi;
    }

    // Probe just outside the current monitor edge in the requested direction.
    // If no monitor found there (edge of virtual desktop), wrap to the opposite side.
    static void MoveToMonitor(IntPtr hWnd, bool toRight) {
        IntPtr hMon = MonitorFromWindow(hWnd, MONITOR_DEFAULTTONEAREST);
        var mi = GetMonInfo(hMon);
        int cy = (mi.rcMonitor.Top + mi.rcMonitor.Bottom) / 2;

        // Probe 1px outside this monitor's edge
        int probeX = toRight ? mi.rcMonitor.Right + 1 : mi.rcMonitor.Left - 1;
        IntPtr hNext = MonitorFromPoint(new POINT { x = probeX, y = cy }, 0);

        // No adjacent monitor — wrap using virtual screen extent
        if (hNext == IntPtr.Zero || hNext == hMon) {
            int vLeft  = GetSystemMetrics(76); // SM_XVIRTUALSCREEN
            int vWidth = GetSystemMetrics(78); // SM_CXVIRTUALSCREEN
            int wrapX  = toRight ? vLeft : vLeft + vWidth - 1;
            hNext = MonitorFromPoint(new POINT { x = wrapX, y = cy }, 2); // nearest
            if (hNext == IntPtr.Zero || hNext == hMon) return;
        }

        var mn = GetMonInfo(hNext);
        RECT wr; GetWindowRect(hWnd, out wr);
        int relX = wr.Left - mi.rcWork.Left;
        int relY = wr.Top  - mi.rcWork.Top;
        int w    = wr.Right  - wr.Left;
        int h    = wr.Bottom - wr.Top;
        // Clamp so window fits inside the target work area
        relX = Math.Max(0, Math.Min(relX, (mn.rcWork.Right  - mn.rcWork.Left) - w));
        relY = Math.Max(0, Math.Min(relY, (mn.rcWork.Bottom - mn.rcWork.Top)  - h));
        ShowWindow(hWnd, SW_RESTORE);
        System.Threading.Thread.Sleep(30);
        MoveWindow(hWnd, mn.rcWork.Left + relX, mn.rcWork.Top + relY, w, h, true);
        Activate(hWnd);
    }

    public static void NextMonitor() { MoveToMonitor(GetForegroundWindow(), true);  }
    public static void PrevMonitor() { MoveToMonitor(GetForegroundWindow(), false); }
}
'@ -Language CSharp -ErrorAction Stop
}
`

let _setupDone = false
async function ensureSetup() {
  if (_setupDone) return
  try {
    await psRunner.run(WIN32_SETUP)
    _setupDone = true
    console.log('[WinMgr] C# type compiled OK')
  } catch (err) {
    console.error('[WinMgr] setup failed:', err)
    throw err
  }
}

async function run(cmd) {
  await ensureSetup()
  return psRunner.run(cmd)
}

module.exports = {
  maximize:    () => run('[WinMgr]::MaximizeToggle()'),
  minimize:    () => run('[WinMgr]::Minimize()'),
  close:       () => run('[WinMgr]::Close()'),
  forceQuit:   () => run('[WinMgr]::ForceQuit()'),
  snapLeft:    () => run('[WinMgr]::SnapLeft()'),
  snapRight:   () => run('[WinMgr]::SnapRight()'),
  taskView:    () => run('[WinMgr]::TaskView()'),
  showDesktop: () => run('[WinMgr]::ShowDesktop()'),
  nextMonitor: () => run('[WinMgr]::NextMonitor()'),
  prevMonitor: () => run('[WinMgr]::PrevMonitor()'),
  appForward:  () => run('[WinMgr]::AppForward()'),
  appBack:     () => run('[WinMgr]::AppBack()'),
}
