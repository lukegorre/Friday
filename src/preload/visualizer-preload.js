'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('leapAPI', {
  onFrame:     (cb) => ipcRenderer.on('leap:frame',  (_e, frame)  => cb(frame)),
  onStatus:    (cb) => ipcRenderer.on('leap:status', (_e, status) => cb(status)),
  getStatus:   ()   => ipcRenderer.invoke('leap:get-status'),
})
