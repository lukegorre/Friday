'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onStateUpdate:   (cb) => ipcRenderer.on('hud:state:update',    (_e, v) => cb(v)),
  onSpotifyUpdate: (cb) => ipcRenderer.on('spotify:track:update', (_e, v) => cb(v)),
  onDiscordUpdate: (cb) => ipcRenderer.on('discord:state:update', (_e, v) => cb(v)),
  closeCheatSheet: () => ipcRenderer.invoke('hud:cheatSheet:close'),
})
