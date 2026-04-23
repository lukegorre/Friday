import { motion } from 'framer-motion'

// Two arcs that fill from both ends toward the center as confidence rises.
// The slot is `width` pixels wide. Each arc is a quarter-circle approximated
// as a thin line that grows from the outer corners toward the center.
export default function ConfidenceArc({ confidence = 0, width = 268 }) {
  const fill = Math.max(0, Math.min(1, confidence))
  const maxLength = width / 2 - 8   // each half can fill to center minus gap

  return (
    <div className="arc-container">
      <svg
        width="100%"
        height="3"
        style={{ display: 'block', overflow: 'visible' }}
        viewBox={`0 0 ${width} 3`}
        preserveAspectRatio="none"
      >
        {/* Left arc — grows right from left edge */}
        <motion.line
          x1={0} y1={1.5}
          x2={0} y2={1.5}
          stroke="rgba(255,255,255,0.7)"
          strokeWidth={1.5}
          strokeLinecap="round"
          animate={{ x2: fill * maxLength }}
          transition={{ duration: 0.08, ease: 'linear' }}
        />
        {/* Right arc — grows left from right edge */}
        <motion.line
          x1={width} y1={1.5}
          x2={width} y2={1.5}
          stroke="rgba(255,255,255,0.7)"
          strokeWidth={1.5}
          strokeLinecap="round"
          animate={{ x2: width - fill * maxLength }}
          transition={{ duration: 0.08, ease: 'linear' }}
        />
      </svg>
    </div>
  )
}
