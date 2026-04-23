'use strict'

const discordIpc = require('../integrations/discord-ipc')

module.exports = {
  micToggle:    () => discordIpc.sendCommand('TOGGLE_MIC'),
  deafenToggle: () => discordIpc.sendCommand('TOGGLE_DEAFEN'),
  pttToggle:    () => discordIpc.sendCommand('PTT_TOGGLE'),
  leaveVoice:   () => discordIpc.sendCommand('DISCONNECT')
}
