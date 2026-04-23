'use strict'

const { BrowserWindow, screen } = require('electron')
const path = require('path')

let _win = null

function create(preloadPath, store) {
  const display = screen.getPrimaryDisplay()
  const { width: sw, height: sh } = display.workAreaSize
  const W = 360, H = sh  // full height, transparent — visible elements sit at bottom-right

  const savedPos = store.get('hudPosition')
  const x = savedPos.x != null ? savedPos.x : sw - W - 20
  const y = savedPos.y != null ? savedPos.y : 0

  _win = new BrowserWindow({
    x, y, width: W, height: H,
    transparent:   true,
    frame:         false,
    hasShadow:     false,
    focusable:     false,
    alwaysOnTop:   true,
    skipTaskbar:   true,
    resizable:     false,
    movable:       true,
    webPreferences: {
      preload:          preloadPath,
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false
    }
  })

  _win.setIgnoreMouseEvents(true, { forward: true })
  _win.setAlwaysOnTop(true, 'screen-saver')

  _win.on('moved', () => {
    const [x, y] = _win.getPosition()
    store.set('hudPosition', { x, y })
  })

  return _win
}

function get() { return _win }

module.exports = { create, get }
