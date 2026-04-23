'use strict'

const { BrowserWindow, screen } = require('electron')

let _win = null

function create(preloadPath) {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  const width = 1400
  const height = 900
  const x = Math.round((sw - width) / 2)
  const y = Math.round((sh - height) / 2)

  _win = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame:     true,
    resizable: true,
    title:     'Leap Motion — Hand Tracking Visualizer',
    webPreferences: {
      preload:          preloadPath,
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false
    }
  })

  return _win
}

function get() { return _win }

module.exports = { create, get }
