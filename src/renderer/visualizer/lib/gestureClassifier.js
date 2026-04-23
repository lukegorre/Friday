// Pure function — no side effects, safe to call every frame.
// Returns all 9 gesture confidences sorted descending.

function fingersByType(hand) {
  // Returns array indexed 0=thumb..4=pinky
  const out = new Array(5).fill(null)
  for (const f of hand.fingers) out[f.type] = f
  return out
}

function angleBetween(a, b) {
  // Angle in degrees between two direction vectors [x,y,z]
  const dot = a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
  return Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI)
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

export function classifyGestures(hand) {
  const f = fingersByType(hand)
  // extended booleans: e[0]=thumb..e[4]=pinky
  const e = f.map(fi => fi ? !!fi.extended : false)

  const thumb  = f[0]
  const index  = f[1]
  const middle = f[2]

  const results = []

  // ── Open Palm ─────────────────────────────────────────────────────────────
  // All 5 fingers extended
  {
    const extCount = e.filter(Boolean).length
    results.push({ name: 'Open Palm', confidence: clamp(extCount / 5, 0, 1) })
  }

  // ── Peace Sign ────────────────────────────────────────────────────────────
  // Index + middle extended, spread >20°; ring+pinky+thumb curled
  {
    let score = 0
    if (e[1] && e[2]) score += 0.4
    if (!e[0]) score += 0.15  // thumb curled
    if (!e[3]) score += 0.15  // ring curled
    if (!e[4]) score += 0.15  // pinky curled
    if (e[1] && e[2] && index && middle) {
      const angle = angleBetween(index.direction, middle.direction)
      if (angle >= 20) score += 0.15 * clamp((angle - 20) / 20, 0, 1)
    }
    results.push({ name: 'Peace Sign', confidence: clamp(score, 0, 1) })
  }

  // ── Two-Finger ────────────────────────────────────────────────────────────
  // Index + middle extended, close together (<15°); ring+pinky+thumb curled
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

  // ── Gun Shape ─────────────────────────────────────────────────────────────
  // Thumb + index extended; middle+ring+pinky curled
  {
    let score = 0
    if (e[0]) score += 0.25
    if (e[1]) score += 0.25
    if (!e[2]) score += 0.17
    if (!e[3]) score += 0.17
    if (!e[4]) score += 0.16
    results.push({ name: 'Gun Shape', confidence: clamp(score, 0, 1) })
  }

  // ── Hang Loose ────────────────────────────────────────────────────────────
  // Thumb + pinky extended; index+middle+ring curled
  {
    let score = 0
    if (e[0]) score += 0.25
    if (e[4]) score += 0.25
    if (!e[1]) score += 0.17
    if (!e[2]) score += 0.17
    if (!e[3]) score += 0.16
    results.push({ name: 'Hang Loose', confidence: clamp(score, 0, 1) })
  }

  // ── Thumbs Up ─────────────────────────────────────────────────────────────
  // All fingers curled; thumb extended upward (direction.y > 0.5)
  {
    let score = 0
    if (e[0]) score += 0.2
    if (!e[1]) score += 0.15
    if (!e[2]) score += 0.15
    if (!e[3]) score += 0.15
    if (!e[4]) score += 0.15
    if (thumb && e[0]) {
      const yComponent = thumb.direction[1]
      if (yComponent > 0) score += 0.2 * clamp(yComponent / 0.9, 0, 1)
    }
    results.push({ name: 'Thumbs Up', confidence: clamp(score, 0, 1) })
  }

  // ── Thumbs Down ───────────────────────────────────────────────────────────
  // All fingers curled; thumb extended downward (direction.y < -0.5)
  {
    let score = 0
    if (e[0]) score += 0.2
    if (!e[1]) score += 0.15
    if (!e[2]) score += 0.15
    if (!e[3]) score += 0.15
    if (!e[4]) score += 0.15
    if (thumb && e[0]) {
      const yComponent = thumb.direction[1]
      if (yComponent < 0) score += 0.2 * clamp(-yComponent / 0.9, 0, 1)
    }
    results.push({ name: 'Thumbs Down', confidence: clamp(score, 0, 1) })
  }

  // ── Index Point ───────────────────────────────────────────────────────────
  // Only index extended; thumb + middle+ring+pinky curled
  {
    let score = 0
    if (e[1]) score += 0.3
    if (!e[0]) score += 0.175
    if (!e[2]) score += 0.175
    if (!e[3]) score += 0.175
    if (!e[4]) score += 0.175
    results.push({ name: 'Index Point', confidence: clamp(score, 0, 1) })
  }

  // ── Pinch ─────────────────────────────────────────────────────────────────
  // Use Leap's own pinchStrength (0–1) directly
  {
    const ps = typeof hand.pinchStrength === 'number' ? hand.pinchStrength : 0
    results.push({ name: 'Pinch', confidence: clamp(ps, 0, 1) })
  }

  return results.sort((a, b) => b.confidence - a.confidence)
}
