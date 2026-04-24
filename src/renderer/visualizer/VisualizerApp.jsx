import React from 'react'
import { useLeapWebSocket } from './hooks/useLeapWebSocket'
import HandCanvas   from './components/HandCanvas'
import GesturePanel from './components/GesturePanel'
import StatusBar    from './components/StatusBar'

export default function VisualizerApp() {
  const { frame, status, fps } = useLeapWebSocket()
  const handCount = frame?.hands?.length ?? 0

  return (
    <div style={{
      width:         '100vw',
      height:        '100vh',
      display:       'flex',
      flexDirection: 'column',
      background:    '#07070f',
      color:         '#fff',
      overflow:      'hidden',
      fontFamily:    '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    }}>
      <StatusBar status={status} fps={fps} handCount={handCount} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Hand canvas — 60% */}
        <div style={{ flex: '0 0 60%', position: 'relative' }}>
          <HandCanvas frame={frame} />
        </div>

        {/* Gesture panel — 40% */}
        <GesturePanel frame={frame} />
      </div>
    </div>
  )
}
