import { useState, useRef } from 'react'

export default function GestureButton({ gesture, label, sublabel, hand = 'right', direction, isHold, holdDuration }) {
  const [state, setState] = useState('idle') // idle | firing | holding
  const [holdProgress, setHoldProgress] = useState(0)
  const progressInterval = useRef(null)
  const startTime = useRef(null)

  const api = window.electronAPI

  async function fire() {
    if (!api) return
    setState('firing')
    await api.triggerGesture({ gesture, hand, direction: direction || null })
    setTimeout(() => setState('idle'), 200)
  }

  function holdStart() {
    if (!api || !isHold) return
    setState('holding')
    setHoldProgress(0)
    startTime.current = Date.now()
    api.holdStart({ gesture, hand, direction: direction || null })

    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current
      const ratio = Math.min(1, elapsed / (holdDuration || 500))
      setHoldProgress(ratio * 100)
    }, 30)
  }

  function holdEnd() {
    if (!api || !isHold) return
    clearInterval(progressInterval.current)
    progressInterval.current = null
    setHoldProgress(0)
    setState('idle')
    api.holdCancel({ gesture, hand })
  }

  const className = `g-btn ${state === 'firing' ? 'firing' : ''} ${state === 'holding' ? 'holding' : ''}`

  if (isHold) {
    return (
      <div
        className={className}
        onPointerDown={holdStart}
        onPointerUp={holdEnd}
        onPointerLeave={holdEnd}
      >
        <span className="g-btn-label">{label}</span>
        {sublabel && <span className="g-btn-sub">{sublabel}</span>}
        {state === 'holding' && (
          <div className="hold-fill" style={{ width: `${holdProgress}%` }} />
        )}
      </div>
    )
  }

  return (
    <div className={className} onClick={fire}>
      <span className="g-btn-label">{label}</span>
      {sublabel && <span className="g-btn-sub">{sublabel}</span>}
    </div>
  )
}
