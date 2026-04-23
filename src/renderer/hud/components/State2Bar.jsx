import { motion } from 'framer-motion'
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

export default function State2Bar({ profile, sensorStatus, modifierActive, volume, brightness, outputAlias, inputAlias }) {
  return (
    <motion.div
      className={`hud-surface hud-drag ${modifierActive ? 'modifier-active' : ''}`}
      initial={{ opacity: 0, height: 40 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* Header row */}
      <div className="strip" style={{ borderBottom: '1px solid var(--divider)' }}>
        <span className="strip-profile">{PROFILE_LABELS[profile] ?? profile}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ModPill visible={modifierActive} />
          <SensorDot status={sensorStatus} />
        </div>
      </div>

      {/* Status values */}
      <div className="status-bar">
        <StatusItem label="VOL" value={volume != null ? `${volume}%` : '—'} />
        <StatusItem label="BRIGHT" value={brightness != null ? `${brightness}%` : '—'} />
        <StatusItem label="OUT" value={outputAlias || '—'} />
        <StatusItem label="IN"  value={inputAlias  || '—'} />
      </div>
    </motion.div>
  )
}

function StatusItem({ label, value }) {
  return (
    <div className="status-item">
      <span className="status-label">{label}</span>
      <span className="status-value" title={value}>{value}</span>
    </div>
  )
}
