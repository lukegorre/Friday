'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig:       ()       => ipcRenderer.invoke('config:get:all'),
  setConfig:       (k, v)   => ipcRenderer.invoke('config:set', { key: k, value: v }),
  setAlias:        (id, a)  => ipcRenderer.invoke('config:alias:set', { deviceId: id, alias: a }),
  deleteAlias:     (id)     => ipcRenderer.invoke('config:alias:delete', { deviceId: id }),
  setRemap:        (p, g, a)=> ipcRenderer.invoke('config:remap:set', { profile: p, gesture: g, actionId: a }),
  resetRemap:      (p, g)   => ipcRenderer.invoke('config:remap:reset', { profile: p, gesture: g }),
  listDevices:     ()       => ipcRenderer.invoke('config:devices:list'),
  spotifyAuthStart:()       => ipcRenderer.invoke('spotify:auth:start'),
  spotifyAuthStatus:()      => ipcRenderer.invoke('spotify:auth:status'),
  spotifyAuthRevoke:()      => ipcRenderer.invoke('spotify:auth:revoke'),
})
