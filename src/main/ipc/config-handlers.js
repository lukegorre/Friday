'use strict'

const { ipcMain } = require('electron')
const IPC = require('../../shared/ipc-channels')
const store = require('../store/config-store')
const spotify = require('../integrations/spotify-client')
const audioRouter = require('../audio/audio-router')

function register() {
  ipcMain.handle(IPC.CONFIG_GET_ALL, () => store.store)

  ipcMain.handle(IPC.CONFIG_SET, (_e, { key, value }) => {
    store.set(key, value)
  })

  ipcMain.handle(IPC.CONFIG_ALIAS_SET, (_e, { deviceId, alias }) => {
    const aliases = store.get('deviceAliases')
    aliases[deviceId] = alias
    store.set('deviceAliases', aliases)
  })

  ipcMain.handle(IPC.CONFIG_ALIAS_DELETE, (_e, { deviceId }) => {
    const aliases = store.get('deviceAliases')
    delete aliases[deviceId]
    store.set('deviceAliases', aliases)
  })

  ipcMain.handle(IPC.CONFIG_REMAP_SET, (_e, { profile, gesture, actionId }) => {
    const remaps = store.get('gestureRemaps')
    if (!remaps[profile]) remaps[profile] = {}
    remaps[profile][gesture] = actionId
    store.set('gestureRemaps', remaps)
  })

  ipcMain.handle(IPC.CONFIG_REMAP_RESET, (_e, { profile, gesture }) => {
    const remaps = store.get('gestureRemaps')
    if (remaps[profile]) {
      delete remaps[profile][gesture]
      store.set('gestureRemaps', remaps)
    }
  })

  ipcMain.handle(IPC.CONFIG_DEVICES_LIST, async () => {
    const devices = await audioRouter.listDevices()
    const aliases = store.get('deviceAliases')
    return devices.map(d => ({ ...d, alias: aliases[d.ID] || null }))
  })

  ipcMain.handle(IPC.SPOTIFY_AUTH_START, () => {
    const url = spotify.startAuth()
    return { url }
  })

  ipcMain.handle(IPC.SPOTIFY_AUTH_STATUS, () => {
    return { connected: spotify.isConnected() }
  })

  ipcMain.handle(IPC.SPOTIFY_AUTH_REVOKE, () => {
    spotify.revoke()
  })
}

module.exports = { register }
