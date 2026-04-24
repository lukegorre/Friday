'use strict'

// Pure classification — no side effects, safe to call every frame.
// Mirrors the renderer's gestureClassifier.js + swipeClassifier.js in CommonJS.

const MAX_SWIPE_SPEED = 800  // mm/s = full swipe confidence
const MIN_SWIPE_SPEED = 150  // mm/s = below this, confidence is forced to 0

function fingersByType(hand) {
  const out = new Array(5).fill(null)
  for (const f of hand.fingers) out[f.type] = f
  return out
}

function angleBetween(a, b) {
  const dot = a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
  return Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI)
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

function classifyGestures(hand) {
  const f = fingersByType(hand)
  const e = f.map(fi => fi ? !!fi.extended : false)
  const thumb  = f[0]
  const index  = f[1]
  const middle = f[2]
  const results = []

  // Open Palm — all 5 extended
  {
    const extCount = e.filter(Boolean).length
    results.push({ name: 'Open Palm', confidence: clamp(extCount / 5, 0, 1) })
  }

  // Peace Sign — index + middle spread >20°; ring+pinky+thumb curled
  {
    let score = 0
    if (e[1] && e[2]) score += 0.4
    if (!e[0]) score += 0.15
    if (!e[3]) score += 0.15
    if (!e[4]) score += 0.15
    if (e[1] && e[2] && index && middle) {
      const angle = angleBetween(index.direction, middle.direction)
      if (angle >= 20) score += 0.15 * clamp((angle - 20) / 20, 0, 1)
    }
    results.push({ name: 'Peace Sign', confidence: clamp(score, 0, 1) })
  }

  // Two-Finger — index + middle close (<15°); rest curled
  {
    let score = 0
    if (e[1] && e[2]) score += 0.4
    if (!e[0]) score += 0.15
    if (!e[3]) score += 0.15
    if (!e[4]) score += 0.15
    if (e[1] && e[2] && index && middle) {
      const angle = angleBetween(index.direction, middle.direction)
      if (angle < 15) score += 0.15 * clamp((15 - angle) / 15, 0, 1)
    }
    results.push({ name: 'Two-Finger', confidence: clamp(score, 0, 1) })
  }

  // Gun Shape — thumb + index; middle+ring+pinky curled
  {
    let score = 0
    if (e[0]) score += 0.25
    if (e[1]) score += 0.25
    if (!e[2]) score += 0.17
    if (!e[3]) score += 0.17
    if (!e[4]) score += 0.16
    results.push({ name: 'Gun Shape', confidence: clamp(score, 0, 1) })
  }

  // Hang Loose — thumb + pinky; index+middle+ring curled
  {
    let score = 0
    if (e[0]) score += 0.25
    if (e[4]) score += 0.25
    if (!e[1]) score += 0.17
    if (!e[2]) score += 0.17
    if (!e[3]) score += 0.16
    results.push({ name: 'Hang Loose', confidence: clamp(score, 0, 1) })
  }

  // Thumbs Up — all curled, thumb pointing up (y > 0)
  {
    let score = 0
    if (e[0]) score += 0.2
    if (!e[1]) score += 0.15
    if (!e[2]) score += 0.15
    if (!e[3]) score += 0.15
    if (!e[4]) score += 0.15
    if (thumb && e[0]) {
      const y = thumb.direction[1]
      if (y > 0) score += 0.2 * clamp(y / 0.75, 0, 1)
    }
    results.push({ name: 'Thumbs Up', confidence: clamp(score, 0, 1) })
  }

  // Thumbs Down — all curled, thumb pointing down (y < 0)
  {
    let score = 0
    if (e[0]) score += 0.2
    if (!e[1]) score += 0.15
    if (!e[2]) score += 0.15
    if (!e[3]) score += 0.15
    if (!e[4]) score += 0.15
    if (thumb && e[0]) {
      const y = thumb.direction[1]
      if (y < 0) score += 0.2 * clamp(-y / 0.75, 0, 1)
    }
    results.push({ name: 'Thumbs Down', confidence: clamp(score, 0, 1) })
  }

  // Index Point — only index; rest curled
  {
    let score = 0
    if (e[1]) score += 0.3
    if (!e[0]) score += 0.175
    if (!e[2]) score += 0.175
    if (!e[3]) score += 0.175
    if (!e[4]) score += 0.175
    results.push({ name: 'Index Point', confidence: clamp(score, 0, 1) })
  }

  // Pinch — use Leap's own pinchStrength
  {
    const ps = typeof hand.pinchStrength === 'number' ? hand.pinchStrength : 0
    results.push({ name: 'Pinch', confidence: clamp(ps, 0, 1) })
  }

  return results.sort((a, b) => b.confidence - a.confidence)
}

function classifySwipes(hand) {
  const index = (hand.fingers ?? []).find(f => f.type === 1)
  const zero = [
    { name: 'Swipe Right', direction: 'right', confidence: 0 },
    { name: 'Swipe Left',  direction: 'left',  confidence: 0 },
    { name: 'Swipe Up',    direction: 'up',    confidence: 0 },
    { name: 'Swipe Down',  direction: 'down',  confidence: 0 },
  ]
  if (!index || !Array.isArray(index.tipVelocity)) return zero
  const [vx, vy] = index.tipVelocity
  if (Math.sqrt(vx * vx + vy * vy) < MIN_SWIPE_SPEED) return zero
  return [
    { name: 'Swipe Right', direction: 'right', confidence: clamp( vx / MAX_SWIPE_SPEED, 0, 1) },
    { name: 'Swipe Left',  direction: 'left',  confidence: clamp(-vx / MAX_SWIPE_SPEED, 0, 1) },
    { name: 'Swipe Up',    direction: 'up',    confidence: clamp( vy / MAX_SWIPE_SPEED, 0, 1) },
    { name: 'Swipe Down',  direction: 'down',  confidence: clamp(-vy / MAX_SWIPE_SPEED, 0, 1) },
  ]
}

function classifyFrame(hand) {
  return { gestures: classifyGestures(hand), swipes: classifySwipes(hand) }
}

module.exports = { classifyGestures, classifySwipes, classifyFrame }
