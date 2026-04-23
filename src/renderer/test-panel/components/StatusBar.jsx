import { useState } from 'react'

const LAYER_NAMES = { 1: 'Layer 1', 2: 'Layer 2 (MOD)', 3: 'Layer 3' }
const PROFILE_LABELS = {
  globalBase: 'Global', browser: 'Browser', mediaPlayer: 'Media',
  creativeTools: 'Creative', codeEditor: 'Code',
  communication: 'Call', documents: 'Docs'
}

export default function StatusBar({ layer, profile, modifierActive, layer3Active, lastFire }) {
  const layerClass = `status-bar layer-${layer}`
  return (
    <div className={layerClass}>
      <div className="status-cell">
        <span className="status-cell-label">Layer</span>
        <span className="status-cell-value">
          {layer === 3 ? 'Layer 3' : layer === 2 ? 'MOD' : 'Layer 1'}
        </span>
      </div>
      <div className="status-cell">
        <span className="status-cell-label">Profile</span>
        <span className="status-cell-value">{PROFILE_LABELS[profile] ?? profile}</span>
      </div>
      {lastFire && (
        <div className="status-cell" style={{ flex: 2 }}>
          <span className="status-cell-label">Last Action</span>
          <span className="status-cell-value" style={{ color: '#86efac', maxWidth: 'none' }}>
            {lastFire.actionDescription}
          </span>
        </div>
      )}
    </div>
  )
}
