import { motion, useAnimation } from 'framer-motion'
import { useEffect } from 'react'
import ConfidenceArc from './ConfidenceArc'
import State2Bar from './State2Bar'

export default function State3GestureSlot({
  gesture, actionDescription, confidence, gestureResult,
  modifierActive, ...barProps
}) {
  const controls = useAnimation()

  useEffect(() => {
    if (gestureResult === 'fire') {
      controls.start({
        opacity: 1, y: 0, x: 0,
        backgroundColor: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0)'],
        transition: { duration: 0.12, times: [0, 0.4, 1] }
      })
    } else if (gestureResult === 'fail') {
      controls.start({
        opacity: 1, y: 0,
        x: [0, -6, 6, -6, 6, 0],
        transition: { duration: 0.2, ease: 'easeInOut' }
      })
    } else {
      controls.start({
        opacity: 1, y: 0, x: 0,
        backgroundColor: 'rgba(255,255,255,0)',
        transition: { type: 'spring', stiffness: 500, damping: 35 }
      })
    }
  }, [gestureResult, controls])

  const gestureName = gesture
    ? gesture.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
      <State2Bar {...barProps} modifierActive={modifierActive} />

      <motion.div
        className={`hud-surface gesture-slot ${modifierActive ? 'modifier-active' : ''}`}
        animate={controls}
        initial={{ opacity: 0, y: 4 }}
      >
        <div className="gesture-name">{gestureName}</div>
        {actionDescription && (
          <div className="gesture-action">{actionDescription}</div>
        )}
        <ConfidenceArc confidence={confidence ?? 0} width={268} />
      </motion.div>
    </div>
  )
}
