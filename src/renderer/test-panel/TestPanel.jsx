import { useState, useEffect } from 'react'
import StatusBar from './components/StatusBar'
import GestureButton from './components/GestureButton'
import LayerControls from './components/LayerControls'

const SECTIONS = [
  {
    id: 'hardwired',
    label: 'Hardwired',
    color: '#a855f7',
    gestures: [
      { label: 'Summon / Banish',  sub: 'Wrist Shoo',        gesture: 'WRIST_SHOO',        hand: 'right' },
      { label: 'Mute System Audio',sub: 'Open Palm',          gesture: 'OPEN_PALM',          hand: 'right' },
      { label: 'Minimize Window',  sub: 'Snap to Fist',       gesture: 'SNAP_TO_FIST',       hand: 'right' },
      { label: 'Cheat Sheet',      sub: 'Peace Sign ×600ms',  gesture: 'PEACE_SIGN',         hand: 'right', isHold: true, holdDuration: 600 },
    ]
  },
  {
    id: 'layer1',
    label: 'Layer 1 — Profile',
    color: '#22c55e',
    gestures: [
      { label: 'App Forward',        sub: 'Flick Right',          gesture: 'TWO_FINGER_FLICK',   direction: 'right', hand: 'right' },
      { label: 'App Back',           sub: 'Flick Left',           gesture: 'TWO_FINGER_FLICK',   direction: 'left',  hand: 'right' },
      { label: 'Maximize Window',    sub: 'Flick Up',             gesture: 'TWO_FINGER_FLICK',   direction: 'up',    hand: 'right' },
      { label: 'Minimize Window',    sub: 'Flick Down',           gesture: 'TWO_FINGER_FLICK',   direction: 'down',  hand: 'right' },
      { label: 'Close Window',       sub: 'Pinch ×500ms',         gesture: 'PINCH',              hand: 'right', isHold: true, holdDuration: 500 },
      { label: 'Task View',          sub: 'Gun Shape ×300ms',     gesture: 'GUN_SHAPE',          hand: 'right', isHold: true, holdDuration: 300 },
      { label: 'Show Desktop',       sub: 'Hang Loose ×300ms',    gesture: 'HANG_LOOSE',         hand: 'right', isHold: true, holdDuration: 300 },
      { label: 'Desktop Right',      sub: 'Twist CW',             gesture: 'INDEX_POINT_TWIST',  direction: 'cw',    hand: 'right' },
      { label: 'Desktop Left',       sub: 'Twist CCW',            gesture: 'INDEX_POINT_TWIST',  direction: 'ccw',   hand: 'right' },
      { label: 'Volume +10%',        sub: 'Thumbs Up',            gesture: 'THUMBS_UP',          hand: 'right' },
      { label: 'Volume −10%',        sub: 'Thumbs Down',          gesture: 'THUMBS_DOWN',        hand: 'right' },
      { label: 'Play / Pause',        sub: 'Dial Rotate',          gesture: 'DIAL_ROTATE',        hand: 'right' },
    ]
  },
  {
    id: 'layer2',
    label: 'Layer 2 — Modifier',
    color: '#3b82f6',
    note: 'Enable MOD first',
    gestures: [
      { label: 'Snap Right Half',    sub: 'Flick Right',          gesture: 'TWO_FINGER_FLICK',   direction: 'right', hand: 'right' },
      { label: 'Snap Left Half',     sub: 'Flick Left',           gesture: 'TWO_FINGER_FLICK',   direction: 'left',  hand: 'right' },
      { label: 'Move Next Monitor',  sub: 'Flick Up',             gesture: 'TWO_FINGER_FLICK',   direction: 'up',    hand: 'right' },
      { label: 'Move Prev Monitor',  sub: 'Flick Down',           gesture: 'TWO_FINGER_FLICK',   direction: 'down',  hand: 'right' },
      { label: 'Force Quit',         sub: 'Pinch ×800ms',         gesture: 'PINCH',              hand: 'right', isHold: true, holdDuration: 800 },
      { label: 'New Virtual Desktop',sub: 'Gun Shape ×300ms',     gesture: 'GUN_SHAPE',          hand: 'right', isHold: true, holdDuration: 300 },
      { label: 'Close Desktop',      sub: 'Hang Loose ×300ms',    gesture: 'HANG_LOOSE',         hand: 'right', isHold: true, holdDuration: 300 },
      { label: 'Win → Next Desktop', sub: 'Twist CW',             gesture: 'INDEX_POINT_TWIST',  direction: 'cw',    hand: 'right' },
      { label: 'Win → Prev Desktop', sub: 'Twist CCW',            gesture: 'INDEX_POINT_TWIST',  direction: 'ccw',   hand: 'right' },
      { label: 'Brightness +10%',    sub: 'Thumbs Up',            gesture: 'THUMBS_UP',          hand: 'right' },
      { label: 'Brightness −10%',    sub: 'Thumbs Down',          gesture: 'THUMBS_DOWN',        hand: 'right' },
      { label: 'Night Mode Toggle',  sub: 'Open Palm',            gesture: 'OPEN_PALM',          hand: 'right' },
    ]
  },
  {
    id: 'layer3',
    label: 'Layer 3 — Gaming / Background',
    color: '#f59e0b',
    note: 'Enter L3 first',
    gestures: [
      { label: 'Discord Mic Mute',   sub: 'Index Up ×400ms',      gesture: 'INDEX_POINT_TWIST',  direction: 'up',    hand: 'right', isHold: true, holdDuration: 400 },
      { label: 'Discord Deafen',     sub: 'Snap to Fist ×400ms',  gesture: 'SNAP_TO_FIST',       hand: 'right', isHold: true, holdDuration: 400 },
      { label: 'Push to Talk',       sub: 'Gun Shape',            gesture: 'GUN_SHAPE',          hand: 'right' },
      { label: 'Leave Voice',        sub: 'Pinch ×800ms',         gesture: 'PINCH',              hand: 'right', isHold: true, holdDuration: 800 },
      { label: 'Spotify Next',       sub: 'Flick Right',          gesture: 'TWO_FINGER_FLICK',   direction: 'right', hand: 'right' },
      { label: 'Spotify Prev',       sub: 'Flick Left',           gesture: 'TWO_FINGER_FLICK',   direction: 'left',  hand: 'right' },
      { label: 'Spotify Volume',     sub: 'Dial Rotate',          gesture: 'DIAL_ROTATE',        hand: 'right' },
      { label: 'Cycle Audio Out',    sub: 'L-Hand Flick Right',   gesture: 'TWO_FINGER_FLICK',   direction: 'right', hand: 'left' },
      { label: 'Cycle Audio In',     sub: 'L-Hand Flick Left',    gesture: 'TWO_FINGER_FLICK',   direction: 'left',  hand: 'left' },
    ]
  }
]

export default function TestPanel() {
  const [layer, setLayer]        = useState(1)
  const [profile, setProfile]    = useState('globalBase')
  const [modifierActive, setMod] = useState(false)
  const [layer3Active, setL3]    = useState(false)
  const [lastFire, setLastFire]  = useState(null)
  const [collapsed, setCollapsed] = useState({})

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    api.onLayerChange(({ layer, modifierActive, layer3Active }) => {
      setLayer(layer)
      setMod(modifierActive)
      setL3(layer3Active)
    })
    api.onProfileChange(({ profile }) => setProfile(profile))
    api.onGestureFire((data) => {
      setLastFire(data)
      setTimeout(() => setLastFire(null), 2000)
    })
  }, [])

  function toggleSection(id) {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="drag-region">
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em' }}>
          FRIDAY — GESTURE TEST PANEL
        </span>
      </div>

      <div className="panel-body">
        <StatusBar
          layer={layer}
          profile={profile}
          modifierActive={modifierActive}
          layer3Active={layer3Active}
          lastFire={lastFire}
        />

        <div className="section">
          <LayerControls modifierActive={modifierActive} layer3Active={layer3Active} />
        </div>

        {SECTIONS.map(section => (
          <div key={section.id} className="section" style={{ padding: 0 }}>
            <button
              className="section-header-btn"
              style={{ '--accent': section.color }}
              onClick={() => toggleSection(section.id)}
            >
              <span className="section-header-accent" />
              <span className="section-header-label">{section.label}</span>
              {section.note && (
                <span className="section-header-note">{section.note}</span>
              )}
              <span className="section-header-chevron">
                {collapsed[section.id] ? '▶' : '▼'}
              </span>
            </button>

            {!collapsed[section.id] && (
              <div className="gesture-grid" style={{ padding: '8px 10px 10px' }}>
                {section.gestures.map((g, i) => (
                  <GestureButton
                    key={i}
                    gesture={g.gesture}
                    label={g.label}
                    sublabel={g.sub}
                    hand={g.hand}
                    direction={g.direction}
                    isHold={g.isHold}
                    holdDuration={g.holdDuration}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
