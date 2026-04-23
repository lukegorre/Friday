'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  triggerGesture:   (payload) => ipcRenderer.invoke('gesture:trigger', payload),
  holdStart:        (payload) => ipcRenderer.invoke('gesture:hold:start', payload),
  holdCancel:       (payload) => ipcRenderer.invoke('gesture:hold:cancel', payload),
  simulateModifierEnter: () => ipcRenderer.invoke('modifier:simulate:enter'),
  simulateModifierExit:  () => ipcRenderer.invoke('modifier:simulate:exit'),
  simulateLayer3Enter:   () => ipcRenderer.invoke('layer3:simulate:enter'),
  simulateLayer3Exit:    () => ipcRenderer.invoke('layer3:simulate:exit'),

  onLayerChange:   (cb) => ipcRenderer.on('state:layer:change',   (_e, v) => cb(v)),
  onProfileChange: (cb) => ipcRenderer.on('state:profile:change', (_e, v) => cb(v)),
  onGestureFire:   (cb) => ipcRenderer.on('state:gesture:fire',   (_e, v) => cb(v)),
})
