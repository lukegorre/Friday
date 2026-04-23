import { useState, useEffect } from 'react'

const PROFILES = ['globalBase', 'browser', 'mediaPlayer', 'creativeTools', 'codeEditor', 'communication', 'documents']
const PROFILE_LABELS = {
  globalBase: 'Global Base', browser: 'Browser', mediaPlayer: 'Media Player',
  creativeTools: 'Creative Tools', codeEditor: 'Code Editor',
  communication: 'Communication', documents: 'Documents',
}

const REMAPPABLE_GESTURES = [
  'TWO_FINGER_FLICK_RIGHT', 'TWO_FINGER_FLICK_LEFT', 'TWO_FINGER_FLICK_UP', 'TWO_FINGER_FLICK_DOWN',
  'PINCH_HOLD', 'GUN_SHAPE_HOLD', 'HANG_LOOSE_HOLD',
  'INDEX_POINT_TWIST_RIGHT', 'INDEX_POINT_TWIST_LEFT',
  'THUMBS_UP', 'THUMBS_DOWN', 'DOUBLE_PINCH',
]

const GESTURE_LABELS = {
  TWO_FINGER_FLICK_RIGHT: 'Flick Right', TWO_FINGER_FLICK_LEFT: 'Flick Left',
  TWO_FINGER_FLICK_UP: 'Flick Up', TWO_FINGER_FLICK_DOWN: 'Flick Down',
  PINCH_HOLD: 'Pinch (hold)', GUN_SHAPE_HOLD: 'Gun Shape (hold)', HANG_LOOSE_HOLD: 'Hang Loose (hold)',
  INDEX_POINT_TWIST_RIGHT: 'Twist Right (CW)', INDEX_POINT_TWIST_LEFT: 'Twist Left (CCW)',
  THUMBS_UP: 'Thumbs Up', THUMBS_DOWN: 'Thumbs Down', DOUBLE_PINCH: 'Double Pinch',
}

export default function GestureRemaps() {
  const [profile, setProfile] = useState('globalBase')
  const [remaps, setRemaps] = useState({})
  const [actions, setActions] = useState([])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    api.getConfig().then(cfg => {
      setRemaps(cfg.gestureRemaps || {})
      // Build action list from config if available, otherwise use a fallback
      setActions(cfg.availableActions || [])
    })
  }, [])

  function setRemap(gesture, actionId) {
    const api = window.electronAPI
    if (!api) return
    api.setRemap(profile, gesture, actionId).then(() =>
      setRemaps(prev => ({
        ...prev,
        [profile]: { ...(prev[profile] || {}), [gesture]: actionId }
      }))
    )
  }

  function resetRemap(gesture) {
    const api = window.electronAPI
    if (!api) return
    api.resetRemap(profile, gesture).then(() =>
      setRemaps(prev => {
        const n = { ...prev, [profile]: { ...(prev[profile] || {}) } }
        delete n[profile][gesture]
        return n
      })
    )
  }

  const profileRemaps = remaps[profile] || {}

  return (
    <>
      <div className="config-section-title">Gesture Remaps</div>
      <div className="config-section-desc">
        Override the default action for any remappable gesture per profile. Hardwired gestures cannot be changed.
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {PROFILES.map(p => (
          <button
            key={p}
            className={`config-btn ${profile === p ? 'primary' : ''}`}
            onClick={() => setProfile(p)}
          >
            {PROFILE_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="config-card">
        {REMAPPABLE_GESTURES.map(g => (
          <div key={g} className="config-row">
            <div style={{ flex: 1 }}>
              <div className="config-row-label">{GESTURE_LABELS[g]}</div>
              {profileRemaps[g] && (
                <div className="config-row-sub" style={{ color: 'rgba(147,197,253,0.7)' }}>
                  Custom: {profileRemaps[g]}
                </div>
              )}
            </div>
            {actions.length > 0 ? (
              <select
                className="config-input"
                value={profileRemaps[g] || ''}
                onChange={e => e.target.value ? setRemap(g, e.target.value) : resetRemap(g)}
                style={{ width: 200 }}
              >
                <option value="">Default</option>
                {actions.map(a => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            ) : (
              <span className="config-row-sub">{profileRemaps[g] || 'Default'}</span>
            )}
            {profileRemaps[g] && (
              <button className="config-btn danger" onClick={() => resetRemap(g)}>Reset</button>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
