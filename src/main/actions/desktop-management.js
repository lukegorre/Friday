'use strict'

const psRunner = require('../ps-runner')

const VDESK_SETUP = `
if (-not ([System.Management.Automation.PSTypeName]'VDesk').Type) {
Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class VDesk {
    [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, IntPtr extra);
    static void Down(byte vk) { keybd_event(vk, 0, 0, IntPtr.Zero); }
    static void Up(byte vk)   { keybd_event(vk, 0, 2, IntPtr.Zero); }

    // Ctrl+Win+Right — switch to next virtual desktop
    public static void Right() {
        Down(0x11); Down(0x5B); Down(0x27);
        Up(0x27); Up(0x5B); Up(0x11);
    }

    // Ctrl+Win+Left — switch to previous virtual desktop
    public static void Left() {
        Down(0x11); Down(0x5B); Down(0x25);
        Up(0x25); Up(0x5B); Up(0x11);
    }

    // Ctrl+Win+D — create new virtual desktop
    public static void Create() {
        Down(0x11); Down(0x5B); Down(0x44);
        Up(0x44); Up(0x5B); Up(0x11);
    }

    // Ctrl+Win+F4 — close current virtual desktop
    public static void Close() {
        Down(0x11); Down(0x5B); Down(0x73);
        Up(0x73); Up(0x5B); Up(0x11);
    }

    // Ctrl+Win+Shift+Right — send active window to next virtual desktop (Windows 11)
    public static void SendRight() {
        Down(0x11); Down(0x5B); Down(0x10); Down(0x27);
        Up(0x27); Up(0x10); Up(0x5B); Up(0x11);
    }

    // Ctrl+Win+Shift+Left — send active window to previous virtual desktop (Windows 11)
    public static void SendLeft() {
        Down(0x11); Down(0x5B); Down(0x10); Down(0x25);
        Up(0x25); Up(0x10); Up(0x5B); Up(0x11);
    }
}
'@ -Language CSharp -ErrorAction Stop
}
`

let _setupDone = false
async function ensureSetup() {
  if (_setupDone) return
  await psRunner.run(VDESK_SETUP)
  _setupDone = true
}

async function run(cmd) {
  await ensureSetup()
  return psRunner.run(cmd)
}

module.exports = {
  desktopRight:  () => run('[VDesk]::Right()'),
  desktopLeft:   () => run('[VDesk]::Left()'),
  createDesktop: () => run('[VDesk]::Create()'),
  closeDesktop:  () => run('[VDesk]::Close()'),
  sendRight:     () => run('[VDesk]::SendRight()'),
  sendLeft:      () => run('[VDesk]::SendLeft()'),
}
