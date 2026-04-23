'use strict'

const { BrowserWindow } = require('electron')

let _win = null

function create(preloadPath) {
  _win = new BrowserWindow({
    width:  900,
    height: 650,
    minWidth: 700,
    minHeight: 500,
    title: 'Friday — Settings',
    webPreferences: {
      preload:          preloadPath,
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false
    }
  })

  _win.on('closed', () => { _win = null })

  return _win
}

function open(preloadPath) {
  if (_win && !_win.isDestroyed()) { _win.focus(); return _win }
  return create(preloadPath)
}

function get() { return _win }

module.exports = { open, get }
