'use strict'

const { ipcMain } = require('electron')
const IPC = require('../../shared/ipc-channels')
const pipeline = require('../pipeline/gesture-pipeline')
const { getState } = require('../state/app-state')
const { TIMING } = require('../../shared/constants')

// Simulate hand presence while the test panel is in use
let _handExitTimer = null
function _keepHandsInZone(hand) {
  if (!getState().handsInZone) pipeline.onHandEnter({ hand })
  clearTimeout(_handExitTimer)
  _handExitTimer = setTimeout(() => pipeline.onHandExit({ hand }), 3000)
}

function register() {
  // Instant gesture fire from test panel
  ipcMain.handle(IPC.GESTURE_TRIGGER, async (_e, { gesture, hand, direction }) => {
    const h = hand || 'right'
    _keepHandsInZone(h)
    await pipeline.onGestureEvent({
      gesture,
      hand:        h,
      direction:   direction || null,
      confidence:  TIMING.CONFIDENCE_THRESHOLD,
      timestamp:   Date.now()
    })
  })

  // Hold gesture start
  ipcMain.handle(IPC.GESTURE_HOLD_START, (_e, { gesture, hand, direction }) => {
    const h = hand || 'right'
    _keepHandsInZone(h)
    pipeline.onHoldStart({ gesture, hand: h, direction: direction || null })
  })

  // Hold gesture cancel
  ipcMain.handle(IPC.GESTURE_HOLD_CANCEL, (_e, { gesture, hand }) => {
    pipeline.onHoldCancel({ gesture, hand: hand || 'right' })
  })

  // Modifier simulation
  ipcMain.handle(IPC.MODIFIER_SIMULATE_ENTER, () => {
    pipeline.onModifierEnter()
  })

  ipcMain.handle(IPC.MODIFIER_SIMULATE_EXIT, () => {
    pipeline.onModifierExit()
  })

  // Layer 3 simulation
  ipcMain.handle(IPC.LAYER3_SIMULATE_ENTER, () => {
    pipeline.onLayer3Enter()
  })

  ipcMain.handle(IPC.LAYER3_SIMULATE_EXIT, () => {
    pipeline.onLayer3Exit()
  })

  // Cheat sheet close from HUD overlay X button
  ipcMain.handle('hud:cheatSheet:close', () => {
    const { getState, setState } = require('../state/app-state')
    const s = getState()
    setState({ hudState: s.handsInZone ? 2 : 1 })
  })
}

module.exports = { register }
