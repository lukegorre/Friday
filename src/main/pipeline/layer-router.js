'use strict'

const { GESTURE_NAMES } = require('../../shared/constants')
const { HARDWIRED, LAYER1, LAYER2, LAYER3, HOLD_GESTURES } = require('../../shared/gesture-map')
const { PROFILES } = require('../../shared/profiles')

/**
 * Build the lookup key for a gesture.
 * Directional gestures use "GESTURE_NAME:direction".
 */
function gestureKey(gesture, direction, hand) {
  const base = direction ? `${gesture}:${direction}` : gesture
  // Layer 3 left-hand gestures prefix with "LEFT:"
  if (hand === 'left') return `LEFT:${base}`
  return base
}

/**
 * Resolve an actionId for a gesture event.
 *
 * Priority:
 *   1. Hardwired — unless current profile has explicit override for this gesture
 *   2. Layer 3 (if active)
 *   3. Layer 2 modifier (if active)
 *   4. Layer 1 — profile override merged over global base
 *
 * Returns { actionId, isHold, holdLayer } or null if no binding found.
 */
function resolve({ gesture, direction, hand, layer, modifierActive, layer3Active, profile, profileRemaps }) {
  const key     = gestureKey(gesture, direction, hand)
  const baseKey = direction ? `${gesture}:${direction}` : gesture

  // ── Layer 3 ──────────────────────────────────────────────────────────────
  if (layer3Active) {
    const l3Action = LAYER3[key] ?? LAYER3[baseKey]
    if (l3Action) {
      const isHold = HOLD_GESTURES.has(gesture) || HOLD_GESTURES.has(key)
      return { actionId: l3Action, isHold, holdLayer: 3 }
    }
    // Fall through to hardwired (wrist shoo always works)
  }

  // ── Layer 2 modifier — checked before hardwired so it can override them ──
  if (modifierActive && hand === 'right') {
    const l2Action = LAYER2[baseKey]
    if (l2Action) {
      return { actionId: l2Action, isHold: HOLD_GESTURES.has(gesture), holdLayer: 2 }
    }
  }

  // ── Hardwired check (with profile override exception) ────────────────────
  const profileOverrides = getProfileGestures(profile, profileRemaps)
  const profileHasOverride = baseKey in profileOverrides || key in profileOverrides

  if (!profileHasOverride && HARDWIRED[gesture]) {
    return { actionId: HARDWIRED[gesture], isHold: false, holdLayer: null }
  }

  // ── Peace sign hold → cheat sheet (hardwired hold) ───────────────────────
  if (gesture === GESTURE_NAMES.PEACE_SIGN) {
    return { actionId: 'hud:cheatSheet', isHold: true, holdLayer: 1 }
  }

  // ── Layer 1 — profile then global base ───────────────────────────────────
  const action = profileOverrides[baseKey] ?? profileOverrides[key]
    ?? LAYER1[PROFILES.GLOBAL_BASE][baseKey]
    ?? LAYER1[PROFILES.GLOBAL_BASE][key]
  if (action) {
    return { actionId: action, isHold: HOLD_GESTURES.has(gesture), holdLayer: 1 }
  }

  return null
}

function getProfileGestures(profile, remaps = {}) {
  const base     = { ...LAYER1[PROFILES.GLOBAL_BASE] }
  const override = { ...(LAYER1[profile] || {}) }
  const remap    = { ...(remaps[profile] || {}) }
  return { ...base, ...override, ...remap }
}

module.exports = { resolve, getProfileGestures }
