'use strict'

const { GESTURE_NAMES, TIMING } = require('../../shared/constants')
const { ACTION_LABELS, ACTIONS } = require('../../shared/gesture-map')
const { resolve } = require('./layer-router')
const holdManager = require('./hold-manager')
const { execute } = require('../actions/action-registry')
const { getState, setState } = require('../state/app-state')
const chime = require('../audio/chime-player')

// Cooldown tracking: gesture → last fire timestamp
const _lastFired = {}
let _cooldownMs  = TIMING.COOLDOWN_MS

function setCooldown(ms) {
  _cooldownMs = Math.max(0, Math.round(ms))
}

function canFire(gesture, now) {
  const last = _lastFired[gesture] || 0
  return (now - last) >= _cooldownMs
}

function recordFire(gesture, now) {
  _lastFired[gesture] = now
}

/**
 * Process a gesture:fire or gesture:forming event from any input source.
 *
 * payload: { gesture, hand, direction?, confidence, timestamp }
 */
async function onGestureEvent(payload) {
  const { gesture, hand, direction, confidence, timestamp } = payload
  const state = getState()

  // ── Cheat sheet open: block everything except Wrist Shoo ────────────────
  if (state.hudState === 4) {
    if (confidence < TIMING.CONFIDENCE_THRESHOLD) return
    const binding = resolve({
      gesture, direction, hand,
      layer:          state.layer,
      modifierActive: state.modifierActive,
      layer3Active:   state.layer3Active,
      profile:        state.profile,
      profileRemaps:  {}
    })
    if (!binding || binding.actionId !== ACTIONS.HUD_TOGGLE) return
    if (!canFire(gesture, timestamp)) return
    recordFire(gesture, timestamp)
    setState({ hudState: state.handsInZone ? 2 : 1, gesture: null, confidence: null, gestureResult: null })
    return
  }

  if (confidence < TIMING.CONFIDENCE_THRESHOLD) {
    // Forming — update HUD State 3
    const binding = resolve({
      gesture, direction, hand,
      layer:          state.layer,
      modifierActive: state.modifierActive,
      layer3Active:   state.layer3Active,
      profile:        state.profile,
      profileRemaps:  {}
    })
    setState({
      hudState:          3,
      gesture,
      confidence,
      actionDescription: binding ? (ACTION_LABELS[binding.actionId] ?? binding.actionId) : null,
      gestureResult:     null
    })
    return
  }

  // ── Confidence threshold met ─────────────────────────────────────────────
  if (!canFire(gesture, timestamp)) return

  const binding = resolve({
    gesture, direction, hand,
    layer:          state.layer,
    modifierActive: state.modifierActive,
    layer3Active:   state.layer3Active,
    profile:        state.profile,
    profileRemaps:  {}
  })

  if (!binding) {
    setState({ hudState: state.handsInZone ? 2 : 1, gesture: null, confidence: null, gestureResult: 'fail' })
    return
  }

  if (binding.isHold) {
    // Hold gestures are started via holdStart, not fire
    return
  }

  recordFire(gesture, timestamp)

  setState({
    hudState:          3,
    gesture,
    confidence,
    actionDescription: ACTION_LABELS[binding.actionId] ?? binding.actionId,
    gestureResult:     'fire'
  })

  await execute(binding.actionId, { gesture, direction, hand })

  // Return HUD to resting state — skip if cheat sheet (State 4) is open
  setTimeout(() => {
    const s = getState()
    if (s.gestureResult === 'fire' && s.hudState !== 4) {
      setState({ hudState: s.handsInZone ? 2 : 1, gesture: null, confidence: null, gestureResult: null })
    }
  }, 1400)
}

/**
 * Start a hold gesture (from test panel or hardware provider).
 */
function onHoldStart({ gesture, hand, direction }) {
  const state = getState()

  const binding = resolve({
    gesture, direction: direction || null, hand,
    layer:          state.layer,
    modifierActive: state.modifierActive,
    layer3Active:   state.layer3Active,
    profile:        state.profile,
    profileRemaps:  {}
  })

  if (!binding?.isHold) return

  holdManager.start({
    gesture, hand,
    layer: binding.holdLayer,
    onProgress: ({ elapsed, required, ratio }) => {
      setState({
        hudState:          3,
        gesture,
        confidence:        ratio,
        actionDescription: ACTION_LABELS[binding.actionId] ?? binding.actionId,
        gestureResult:     null
      })
    },
    onComplete: async () => {
      setState({ gestureResult: 'fire' })
      await execute(binding.actionId, { gesture, hand })
      setTimeout(() => {
        const s = getState()
        if (s.gestureResult === 'fire' && s.hudState !== 4) {
          setState({ hudState: s.handsInZone ? 2 : 1, gesture: null, confidence: null, gestureResult: null })
        }
      }, 1400)
    },
    onCancel: () => {
      setState({ hudState: getState().handsInZone ? 2 : 1, gesture: null, confidence: null, gestureResult: 'fail' })
      setTimeout(() => setState({ gestureResult: null }), 300)
    }
  })
}

function onHoldCancel({ gesture, hand }) {
  holdManager.cancel(gesture, hand)
}

/**
 * Modifier layer entry/exit
 */
function onModifierEnter() {
  setState({ modifierActive: true, layer: 2 })
}

function onModifierExit() {
  const state = getState()
  if (!state.layer3Active) {
    setState({ modifierActive: false, layer: 1 })
  }
}

/**
 * Layer 3 entry/exit
 */
async function onLayer3Enter() {
  setState({ layer3Active: true, layer: 3, modifierActive: false })
  await chime.playEnter()
}

async function onLayer3Exit() {
  setState({ layer3Active: false, layer: 1, modifierActive: false })
  await chime.playExit()
}

/**
 * Hand presence tracking
 */
function onHandEnter({ hand }) {
  const update = hand === 'left' ? { leftHandPresent: true } : { rightHandPresent: true }
  const state = { ...getState(), ...update }
  setState({ ...update, handsInZone: true, hudState: Math.max(getState().hudState, 2) })
}

function onHandExit({ hand }) {
  const update = hand === 'left' ? { leftHandPresent: false } : { rightHandPresent: false }
  setState(update)
  const s = getState()
  if (!s.leftHandPresent && !s.rightHandPresent) {
    setState({ handsInZone: false, hudState: s.hudState === 4 ? 4 : 1, gesture: null, confidence: null })
    holdManager.cancelAll()
  }
}

module.exports = {
  setCooldown,
  onGestureEvent,
  onHoldStart,
  onHoldCancel,
  onModifierEnter,
  onModifierExit,
  onLayer3Enter,
  onLayer3Exit,
  onHandEnter,
  onHandExit
}
