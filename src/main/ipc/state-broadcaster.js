'use strict'

const { onStateChange } = require('../state/app-state')
const IPC = require('../../shared/ipc-channels')

let _hudWindow       = null
let _testPanelWindow = null

function init(hudWin, testPanelWin) {
  _hudWindow       = hudWin
  _testPanelWindow = testPanelWin

  onStateChange((state, prev) => {
    broadcast(state, prev)
  })
}

function safesSend(win, channel, payload) {
  if (!win || win.isDestroyed() || !win.webContents) return
  try { win.webContents.send(channel, payload) } catch (_) {}
}

function broadcast(state, prev) {
  // ── Cheat sheet mouse-event toggle ──────────────────────────────────────
  // State 4 needs real mouse events so the X button is clickable.
  if (state.hudState === 4 && prev.hudState !== 4) {
    if (_hudWindow && !_hudWindow.isDestroyed()) _hudWindow.setIgnoreMouseEvents(false)
  } else if (state.hudState !== 4 && prev.hudState === 4) {
    if (_hudWindow && !_hudWindow.isDestroyed()) _hudWindow.setIgnoreMouseEvents(true, { forward: true })
  }

  // ── HUD state update ────────────────────────────────────────────────────
  const hudPayload = {
    hudState:          state.hudState,
    layer:             state.layer,
    modifierActive:    state.modifierActive,
    layer3Active:      state.layer3Active,
    profile:           state.profile,
    sensorStatus:      state.sensorStatus,
    hudVisible:        state.hudVisible,
    volume:            state.volume,
    brightness:        state.brightness,
    outputAlias:       state.outputAlias,
    inputAlias:        state.inputAlias,
    gesture:           state.gesture,
    confidence:        state.confidence,
    actionDescription: state.actionDescription,
    gestureResult:     state.gestureResult,
    cheatSheet:        state.cheatSheet,
    discord:           state.discord,
    spotify:           state.spotify
  }
  safesSend(_hudWindow, IPC.HUD_STATE_UPDATE, hudPayload)

  // ── Test panel updates ──────────────────────────────────────────────────
  if (prev.layer !== state.layer || prev.modifierActive !== state.modifierActive) {
    safesSend(_testPanelWindow, IPC.STATE_LAYER_CHANGE, {
      layer:          state.layer,
      modifierActive: state.modifierActive,
      layer3Active:   state.layer3Active
    })
  }

  if (prev.profile !== state.profile) {
    safesSend(_testPanelWindow, IPC.STATE_PROFILE_CHANGE, { profile: state.profile })
  }

  if (state.gestureResult === 'fire' && prev.gestureResult !== 'fire') {
    safesSend(_testPanelWindow, IPC.STATE_GESTURE_FIRE, {
      gesture:           state.gesture,
      actionDescription: state.actionDescription
    })
  }
}

module.exports = { init }
