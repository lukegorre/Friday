'use strict'

const { GESTURE_EVENTS, GESTURE_NAMES, TIMING, HOLD_DURATIONS } = require('../../shared/constants')
const { GESTURE_HOLD_DURATIONS } = require('../../shared/gesture-map')

// One active hold per gesture per hand
const _holds = new Map() // key: `${hand}:${gesture}`

function getHoldDuration(gesture, layer) {
  const entry = GESTURE_HOLD_DURATIONS[gesture]
  if (!entry) return null
  const layerKey = `layer${layer}`
  return entry[layerKey] ?? null
}

function start({ gesture, hand, layer, onComplete, onProgress, onCancel }) {
  const key = `${hand}:${gesture}`
  if (_holds.has(key)) cancel(gesture, hand)

  const required = getHoldDuration(gesture, layer)
  if (required === null) {
    onComplete && onComplete({ elapsed: 0, required: 0 })
    return
  }

  const startedAt = Date.now()

  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - startedAt
    onProgress && onProgress({ elapsed, required, ratio: Math.min(1, elapsed / required) })
  }, 50)

  const completionTimer = setTimeout(() => {
    clearInterval(progressInterval)
    _holds.delete(key)
    onComplete && onComplete({ elapsed: required, required })
  }, required)

  _holds.set(key, {
    gesture, hand, layer, required, startedAt,
    progressInterval, completionTimer,
    onCancel
  })
}

function cancel(gesture, hand) {
  const key = `${hand}:${gesture}`
  const hold = _holds.get(key)
  if (!hold) return

  clearInterval(hold.progressInterval)
  clearTimeout(hold.completionTimer)
  _holds.delete(key)

  const elapsed = Date.now() - hold.startedAt
  hold.onCancel && hold.onCancel({ elapsed, required: hold.required })
}

function cancelAll() {
  // Key format: `${hand}:${gesture}` — hand is always first token
  for (const [key] of [..._holds]) {
    const colonIdx = key.indexOf(':')
    const hand    = key.slice(0, colonIdx)
    const gesture = key.slice(colonIdx + 1)
    cancel(gesture, hand)
  }
}

function isHolding(gesture, hand) {
  return _holds.has(`${hand}:${gesture}`)
}

module.exports = { start, cancel, cancelAll, isHolding, getHoldDuration }
