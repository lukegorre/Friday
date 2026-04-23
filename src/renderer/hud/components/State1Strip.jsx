import SensorDot from './SensorDot'
import ModPill from './ModPill'

const PROFILE_LABELS = {
  globalBase:    'Global',
  browser:       'Browser',
  mediaPlayer:   'Media',
  creativeTools: 'Creative',
  codeEditor:    'Code',
  communication: 'Call',
  documents:     'Docs'
}

export default function State1Strip({ profile, sensorStatus, modifierActive }) {
  return (
    <div className={`hud-surface hud-drag strip ${modifierActive ? 'modifier-active' : ''}`}>
      <span className="strip-profile">{PROFILE_LABELS[profile] ?? profile}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ModPill visible={modifierActive} />
        <SensorDot status={sensorStatus} />
      </div>
    </div>
  )
}
