import { useState, useEffect, useRef, useCallback } from 'react'

const FPS_WINDOW = 30

export function useLeapWebSocket() {
  const [frame, setFrame]   = useState(null)
  const [status, setStatus] = useState('waiting')
  const [fps, setFps]       = useState(0)

  const fpsTimesRef    = useRef([])
  const nativeFpsRef   = useRef(0)
  const latestFrameRef = useRef(null)  // written by IPC callback, read by rAF loop
  const rafRef         = useRef(null)
  const holdTimerRef   = useRef(null)
  const loggedRef      = useRef(false)

  const trackFps = useCallback(() => {
    const now = performance.now()
    fpsTimesRef.current.push(now)
    if (fpsTimesRef.current.length > FPS_WINDOW) fpsTimesRef.current.shift()
    const times = fpsTimesRef.current
    if (times.length >= 2) {
      const elapsed = times[times.length - 1] - times[0]
      const measured = Math.round(((times.length - 1) / elapsed) * 1000)
      setFps(nativeFpsRef.current || measured)
    }
  }, [])

  useEffect(() => {
    const api = window.leapAPI
    if (!api) { console.warn('[useLeap] leapAPI not available'); return }

    api.getStatus().then(s => { if (s) setStatus(s) }).catch(() => {})

    // rAF loop — React state updates happen at display rate (≤60fps), never faster.
    // IPC frames arrive at 115fps; the ref absorbs them with zero render cost.
    function rafLoop() {
      const frameData = latestFrameRef.current
      if (frameData !== null) {
        latestFrameRef.current = null
        if (frameData.hands.length > 0) {
          if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
          setFrame({ hands: frameData.hands })
        } else {
          if (!holdTimerRef.current) {
            holdTimerRef.current = setTimeout(() => {
              holdTimerRef.current = null
              setFrame({ hands: [] })
            }, 200)
          }
        }
      }
      rafRef.current = requestAnimationFrame(rafLoop)
    }
    rafRef.current = requestAnimationFrame(rafLoop)

    const offFrame = api.onFrame(frameData => {
      api.ack()  // release the next frame immediately — keeps IPC slot-based, no queue
      nativeFpsRef.current = frameData.fps || 0
      trackFps()
      if (!loggedRef.current && frameData.hands.length > 0) {
        console.log('[useLeap] first hands at renderer:', frameData.hands.length,
          'palmY:', frameData.hands[0]?.palmPosition?.[1]?.toFixed(0))
        loggedRef.current = true
      }
      latestFrameRef.current = frameData  // store only — rAF loop renders it
    })

    const offStatus = api.onStatus(s => {
      setStatus(s)
      if (s !== 'connected') {
        setFps(0)
        fpsTimesRef.current  = []
        nativeFpsRef.current = 0
        latestFrameRef.current = null
        setFrame(null)
      }
    })

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
      offFrame?.()
      offStatus?.()
    }
  }, [trackFps])

  return { frame, status, fps }
}
