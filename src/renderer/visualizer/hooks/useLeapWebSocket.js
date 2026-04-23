import { useState, useEffect, useRef, useCallback } from 'react'

const LEAP_WS_URL    = 'ws://127.0.0.1:6437/v6.json'
const FPS_WINDOW     = 30
const FOCUS_HZ_MS    = 500   // re-assert focus every 500ms while window is focused

export function useLeapWebSocket() {
  const [frame, setFrame]   = useState(null)
  const [status, setStatus] = useState('waiting')
  const [fps, setFps]       = useState(0)

  const fpsTimesRef = useRef([])
  const wsRef       = useRef(null)

  const trackFps = useCallback(() => {
    const now = performance.now()
    fpsTimesRef.current.push(now)
    if (fpsTimesRef.current.length > FPS_WINDOW) fpsTimesRef.current.shift()
    const times = fpsTimesRef.current
    if (times.length >= 2) {
      const elapsed = times[times.length - 1] - times[0]
      setFps(Math.round(((times.length - 1) / elapsed) * 1000))
    }
  }, [])

  useEffect(() => {
    let retry    = null
    let heartbeat = null
    let active   = true

    function send(obj) {
      const ws = wsRef.current
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj))
    }

    function startHeartbeat() {
      stopHeartbeat()
      send({ focused: true })
      heartbeat = setInterval(() => send({ focused: true }), FOCUS_HZ_MS)
    }
    function stopHeartbeat() {
      clearInterval(heartbeat)
      heartbeat = null
    }

    const onFocus = () => startHeartbeat()
    const onBlur  = () => { stopHeartbeat(); send({ focused: false }) }

    window.addEventListener('focus', onFocus)
    window.addEventListener('blur',  onBlur)

    function connect() {
      if (!active) return
      const ws = new WebSocket(LEAP_WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus('connected')
        if (document.hasFocus()) startHeartbeat()
        else send({ focused: false })
      }

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (!Array.isArray(data.hands)) return
          const pointables = Array.isArray(data.pointables) ? data.pointables : []
          const hands = data.hands.map(h => ({
            ...h,
            fingers: pointables.filter(p => p.handId === h.id)
          }))
          trackFps()
          setFrame({ ...data, hands })
        } catch {}
      }

      ws.onerror = () => setStatus('error')

      ws.onclose = () => {
        wsRef.current = null
        stopHeartbeat()
        setStatus('waiting')
        setFps(0)
        fpsTimesRef.current = []
        if (active) retry = setTimeout(connect, 2000)
      }
    }

    connect()

    return () => {
      active = false
      clearTimeout(retry)
      stopHeartbeat()
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur',  onBlur)
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    }
  }, [trackFps])

  return { frame, status, fps }
}
