// Pure function — no side effects, safe to call every frame.
// Returns 4 directional swipe confidences from the index finger tip velocity.
// 800 mm/s = full confidence (1.0). Below MIN_SPEED, confidence is forced to 0.

const MAX_SPEED = 800  // mm/s — deliberate flick = near 1.0; lazy drift scores lower
const MIN_SPEED = 150  // mm/s — below this, output is 0 (kills tremor false-positives)

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

// orientation: 'FORWARD_FACING' | 'TOP_DOWN'
// FORWARD_FACING: up/down swipes use Z-axis velocity (perpendicular to sensor face)
// TOP_DOWN:       up/down swipes use Y-axis velocity
export function classifySwipes(hand, orientation = 'FORWARD_FACING') {
  const index = hand.fingers?.find(f => f.type === 1)
  const zero = [
    { name: 'Swipe Right', direction: 'right', confidence: 0 },
    { name: 'Swipe Left',  direction: 'left',  confidence: 0 },
    { name: 'Swipe Up',    direction: 'up',    confidence: 0 },
    { name: 'Swipe Down',  direction: 'down',  confidence: 0 },
  ]
  if (!index || !Array.isArray(index.tipVelocity)) return zero

  const [vx, vy, vz] = index.tipVelocity
  const vv = orientation === 'FORWARD_FACING' ? vz : vy  // vertical axis velocity
  const speed = Math.sqrt(vx * vx + vv * vv)
  if (speed < MIN_SPEED) return zero

  return [
    { name: 'Swipe Right', direction: 'right', confidence: clamp( vx / MAX_SPEED, 0, 1) },
    { name: 'Swipe Left',  direction: 'left',  confidence: clamp(-vx / MAX_SPEED, 0, 1) },
    { name: 'Swipe Up',    direction: 'up',    confidence: clamp( vv / MAX_SPEED, 0, 1) },
    { name: 'Swipe Down',  direction: 'down',  confidence: clamp(-vv / MAX_SPEED, 0, 1) },
  ]
}
