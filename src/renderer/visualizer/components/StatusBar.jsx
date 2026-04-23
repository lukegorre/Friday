import React from 'react'

const DOT = {
  connected: '#22c55e',
  waiting:   '#f59e0b',
  error:     '#ef4444',
}

export default function StatusBar({ status, fps, handCount }) {
  const dot   = DOT[status] || DOT.waiting
  const label = (status || 'waiting').toUpperCase()

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '7px 16px',
      background:     'rgba(255,255,255,0.03)',
      borderBottom:   '1px solid rgba(255,255,255,0.07)',
      flexShrink:     0,
      userSelect:     'none',
    }}>
      {/* Left: status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: dot, boxShadow: `0 0 5px ${dot}`,
        }} />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: dot }}>
          {label}
        </span>
      </div>

      {/* Center: hint when no hands */}
      {status === 'connected' && handCount === 0 && (
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em' }}>
          CLICK WINDOW · PLACE HAND ABOVE SENSOR
        </span>
      )}

      {/* Right: stats */}
      <div style={{ display: 'flex', gap: 18 }}>
        <Stat label="FPS"   value={fps} />
        <Stat label="HANDS" value={handCount} />
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'baseline' }}>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  )
}
