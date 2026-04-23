'use strict'

const { EventEmitter } = require('events')
const { PROFILES } = require('../../shared/profiles')

const emitter = new EventEmitter()

let _state = {
  // Layer system
  layer:           1,        // 1 | 2 | 3
  modifierActive:  false,
  layer3Active:    false,

  // Profile
  profile:         PROFILES.GLOBAL_BASE,

  // Hands
  handsInZone:     false,
  leftHandPresent: false,
  rightHandPresent:false,

  // HUD
  hudVisible:      true,
  hudState:        1,        // 1 | 2 | 3 | 4

  // Sensor
  sensorStatus:    'disconnected', // 'connected' | 'disconnected' | 'degraded'

  // System values (polled periodically)
  volume:          null,
  brightness:      null,
  outputAlias:     null,
  inputAlias:      null,

  // Gesture forming (HUD State 3)
  gesture:         null,
  confidence:      null,
  actionDescription: null,
  gestureResult:   null,  // null | 'fire' | 'fail'

  // Cheat sheet data (HUD State 4)
  cheatSheet:      null,

  // Discord
  discord: {
    micMuted:    false,
    deafened:    false,
    inVoice:     false,
    channelName: null
  },

  // Spotify
  spotify: {
    name:     null,
    artist:   null,
    progress: 0,
    duration: 0,
    volume:   null,
    playing:  false
  }
}

function getState() {
  return _state
}

function setState(partial) {
  const prev = _state
  _state = { ..._state, ...partial }

  // Nested merge for discord/spotify
  if (partial.discord) _state.discord = { ..._state.discord, ...partial.discord }
  if (partial.spotify) _state.spotify = { ..._state.spotify, ...partial.spotify }

  emitter.emit('change', _state, prev)
}

function onStateChange(fn) {
  emitter.on('change', fn)
  return () => emitter.off('change', fn)
}

module.exports = { getState, setState, onStateChange }
