import { useState, useEffect } from 'react'

const PROFILES = [
  { id: 'globalBase',     label: 'Global Base',     desc: 'Fallback for any app without a dedicated profile' },
  { id: 'browser',        label: 'Browser',         desc: 'Chrome, Firefox, Arc, Edge, Safari' },
  { id: 'mediaPlayer',    label: 'Media Player',    desc: 'Spotify, VLC, YouTube, Netflix, Twitch, streaming tabs' },
  { id: 'creativeTools',  label: 'Creative Tools',  desc: 'Photoshop, Figma, Illustrator, Affinity apps' },
  { id: 'codeEditor',     label: 'Code Editor',     desc: 'VS Code, JetBrains IDEs, Xcode, Sublime Text' },
  { id: 'communication',  label: 'Communication',   desc: 'Zoom, Teams, Google Meet, Discord' },
  { id: 'documents',      label: 'Documents',       desc: 'Word, Notion, Obsidian, PDF viewers' },
]

const HARDWIRED = [
  { gesture: 'Wrist Shoo',            action: 'Summon / Banish — toggle HUD on/off' },
  { gesture: 'Peace Sign (hold 600ms)', action: 'Cheat Sheet — open gesture reference overlay' },
  { gesture: 'Open Palm',             action: 'Silence — mute/unmute system audio' },
  { gesture: 'Snap to Fist',          action: 'Dismiss — minimize active window' },
]

export default function ProfileManager() {
  const [activeProfile, setActiveProfile] = useState(null)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    api.getConfig().then(cfg => {
      setActiveProfile(cfg.activeProfile || 'globalBase')
    })
  }, [])

  return (
    <>
      <div className="config-section-title">Profiles</div>
      <div className="config-section-desc">
        Profiles activate automatically based on the foreground application. The active profile is read-only — it updates as you switch apps.
      </div>

      {activeProfile && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Active now:</span>
          <span className="status-badge connected">{activeProfile}</span>
        </div>
      )}

      <div className="config-card" style={{ marginBottom: 24 }}>
        {PROFILES.map(p => (
          <div key={p.id} className="config-row">
            <div style={{ flex: 1 }}>
              <div className="config-row-label">{p.label}</div>
              <div className="config-row-sub">{p.desc}</div>
            </div>
            {activeProfile === p.id && (
              <span className="status-badge connected">Active</span>
            )}
          </div>
        ))}
      </div>

      <div className="config-section-title" style={{ fontSize: 15, marginBottom: 4 }}>Hardwired Gestures</div>
      <div className="config-section-desc">
        These gestures cannot be remapped. They work in every profile and every layer.
      </div>
      <div className="config-card">
        {HARDWIRED.map(h => (
          <div key={h.gesture} className="config-row">
            <div style={{ flex: 1 }}>
              <div className="config-row-label">{h.gesture}</div>
              <div className="config-row-sub">{h.action}</div>
            </div>
            <span className="status-badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10 }}>
              locked
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
