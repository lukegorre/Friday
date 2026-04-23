'use strict'

const { BrowserWindow, screen } = require('electron')

let _win = null

function create(preloadPath) {
  const { width: sw } = screen.getPrimaryDisplay().workAreaSize

  _win = new BrowserWindow({
    x:       sw - 460 - 20,
    y:       60,
    width:   460,
    height:  860,
    frame:   false,
    focusable: false,   // WS_EX_NOACTIVATE — clicks work, focus never stolen
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    webPreferences: {
      preload:          preloadPath,
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false
    }
  })

  _win.setAlwaysOnTop(true, 'floating')

  return _win
}

function get() { return _win }

module.exports = { create, get }
