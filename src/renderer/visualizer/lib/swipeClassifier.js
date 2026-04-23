// Pure function — no side effects, safe to call every frame.
// Returns 4 directional swipe confidences from the index finger tip velocity.
// 600 mm/s = full confidence (1.0).

const MAX_SPEED = 600 // mm/s

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

export function classifySwipes(hand) {
  const index = hand.fingers?.find(f => f.type === 1)
  if (!index || !Array.isArray(index.tipVelocity)) {
    return [
      { name: 'Swipe Right', direction: 'right', confidence: 0 },
      { name: 'Swipe Left',  direction: 'left',  confidence: 0 },
      { name: 'Swipe Up',    direction: 'up',    confidence: 0 },
      { name: 'Swipe Down',  direction: 'down',  confidence: 0 },
    ]
  }

  const [vx, vy] = index.tipVelocity

  return [
    { name: 'Swipe Right', direction: 'right', confidence: clamp( vx / MAX_SPEED, 0, 1) },
    { name: 'Swipe Left',  direction: 'left',  confidence: clamp(-vx / MAX_SPEED, 0, 1) },
    { name: 'Swipe Up',    direction: 'up',    confidence: clamp( vy / MAX_SPEED, 0, 1) },
    { name: 'Swipe Down',  direction: 'down',  confidence: clamp(-vy / MAX_SPEED, 0, 1) },
  ]
}
