import { useState } from 'react'

export default function DirectionalGesture({ gesture, label, directions, hand = 'right' }) {
  const [firing, setFiring] = useState(null)
  const api = window.electronAPI

  async function fire(direction) {
    if (!api) return
    setFiring(direction)
    await api.triggerGesture({ gesture, hand, direction })
    setTimeout(() => setFiring(null), 200)
  }

  // 4-way: up/down/left/right
  if (directions === '4way') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '32px 32px 32px', gridTemplateRows: '32px 20px 32px', gap: 3 }}>
          <div />
          <DirBtn label="↑" active={firing === 'up'}   onClick={() => fire('up')} />
          <div />
          <DirBtn label="←" active={firing === 'left'}  onClick={() => fire('left')} />
          <div className="dir-btn center-label">{label.slice(0,4)}</div>
          <DirBtn label="→" active={firing === 'right'} onClick={() => fire('right')} />
          <div />
          <DirBtn label="↓" active={firing === 'down'}  onClick={() => fire('down')} />
          <div />
        </div>
      </div>
    )
  }

  // 2-way: cw/ccw
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <DirBtn label="↺ CCW" wide active={firing === 'ccw'} onClick={() => fire('ccw')} />
        <DirBtn label="↻ CW"  wide active={firing === 'cw'}  onClick={() => fire('cw')} />
      </div>
    </div>
  )
}

function DirBtn({ label, active, onClick, wide }) {
  return (
    <div
      className="dir-btn"
      style={{
        background: active ? 'rgba(255,255,255,0.22)' : undefined,
        width:  wide ? 48 : 32,
        height: 32,
        fontSize: wide ? 9 : 14
      }}
      onClick={onClick}
    >
      {label}
    </div>
  )
}
