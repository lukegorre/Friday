'use strict'

const IPC = Object.freeze({
  // ── Test Panel → Main ────────────────────────────────────────────────
  GESTURE_TRIGGER:          'gesture:trigger',
  GESTURE_HOLD_START:       'gesture:hold:start',
  GESTURE_HOLD_CANCEL:      'gesture:hold:cancel',
  MODIFIER_SIMULATE_ENTER:  'modifier:simulate:enter',
  MODIFIER_SIMULATE_EXIT:   'modifier:simulate:exit',
  LAYER3_SIMULATE_ENTER:    'layer3:simulate:enter',
  LAYER3_SIMULATE_EXIT:     'layer3:simulate:exit',

  // ── Config → Main ───────────────────────────────────────────────────
  CONFIG_GET_ALL:           'config:get:all',
  CONFIG_SET:               'config:set',
  CONFIG_ALIAS_SET:         'config:alias:set',
  CONFIG_ALIAS_DELETE:      'config:alias:delete',
  CONFIG_REMAP_SET:         'config:remap:set',
  CONFIG_REMAP_RESET:       'config:remap:reset',
  CONFIG_DEVICES_LIST:      'config:devices:list',
  SPOTIFY_AUTH_START:       'spotify:auth:start',
  SPOTIFY_AUTH_STATUS:      'spotify:auth:status',
  SPOTIFY_AUTH_REVOKE:      'spotify:auth:revoke',

  // ── Main → Visualizer ──────────────────────────────────────────────────
  LEAP_FRAME:               'leap:frame',
  LEAP_STATUS:              'leap:status',

  // ── Main → HUD ──────────────────────────────────────────────────────
  HUD_STATE_UPDATE:         'hud:state:update',
  SPOTIFY_TRACK_UPDATE:     'spotify:track:update',
  DISCORD_STATE_UPDATE:     'discord:state:update',

  // ── Main → Test Panel ───────────────────────────────────────────────
  STATE_LAYER_CHANGE:       'state:layer:change',
  STATE_PROFILE_CHANGE:     'state:profile:change',
  STATE_GESTURE_FIRE:       'state:gesture:fire'
})

module.exports = IPC
