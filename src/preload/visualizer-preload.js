'use strict'

const { contextBridge, ipcRenderer } = require('electron')

// Forward renderer JS errors to main process so they appear in stdout
window.addEventListener('error', (e) => {
  ipcRenderer.send('renderer:error', { message: e.message, stack: e.error?.stack })
})
window.addEventListener('unhandledrejection', (e) => {
  ipcRenderer.send('renderer:error', { message: String(e.reason?.message ?? e.reason), stack: e.reason?.stack })
})

contextBridge.exposeInMainWorld('leapAPI', {
  onFrame: (cb) => {
    const handler = (_e, frame) => cb(frame)
    ipcRenderer.on('leap:frame', handler)
    return () => ipcRenderer.removeListener('leap:frame', handler)
  },
  onStatus: (cb) => {
    const handler = (_e, status) => cb(status)
    ipcRenderer.on('leap:status', handler)
    return () => ipcRenderer.removeListener('leap:status', handler)
  },
  getStatus:          () => ipcRenderer.invoke('leap:get-status'),
  setGesturesEnabled: (enabled) => ipcRenderer.send('gestures:set-enabled', enabled),
  ack:                () => ipcRenderer.send('leap:vis:ack'),
  setCooldown:        (ms) => ipcRenderer.send('gesture:cooldown', ms),
})
