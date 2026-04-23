import { useState, useEffect } from 'react'

export default function DeviceAliases() {
  const [devices, setDevices] = useState([])
  const [aliases, setAliases] = useState({})
  const [drafts, setDrafts] = useState({})

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    api.listDevices().then(list => {
      setDevices(list)
      setDrafts(Object.fromEntries(list.map(d => [d.id, ''])))
    })
    api.getConfig().then(cfg => {
      setAliases(cfg.deviceAliases || {})
    })
  }, [])

  function save(deviceId) {
    const api = window.electronAPI
    if (!api) return
    const value = drafts[deviceId] || ''
    if (value.trim()) {
      api.setAlias(deviceId, value.trim()).then(() =>
        setAliases(prev => ({ ...prev, [deviceId]: value.trim() }))
      )
    }
  }

  function remove(deviceId) {
    const api = window.electronAPI
    if (!api) return
    api.deleteAlias(deviceId).then(() =>
      setAliases(prev => { const n = { ...prev }; delete n[deviceId]; return n })
    )
  }

  return (
    <>
      <div className="config-section-title">Device Aliases</div>
      <div className="config-section-desc">
        Assign short display names for audio devices. These names appear in the HUD — raw OS names are never shown there.
      </div>

      <div className="config-card">
        {devices.length === 0 && (
          <div className="config-row">
            <span className="config-row-label" style={{ color: 'rgba(255,255,255,0.3)' }}>
              No audio devices found
            </span>
          </div>
        )}
        {devices.map(d => (
          <div key={d.id} className="config-row">
            <div style={{ flex: 1 }}>
              <div className="config-row-label">{aliases[d.id] || d.name}</div>
              <div className="config-row-sub">{d.type} · {d.name}</div>
            </div>
            <input
              className="config-input"
              placeholder={aliases[d.id] || 'Set alias…'}
              value={drafts[d.id] || ''}
              onChange={e => setDrafts(prev => ({ ...prev, [d.id]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && save(d.id)}
            />
            <button className="config-btn primary" onClick={() => save(d.id)}>Save</button>
            {aliases[d.id] && (
              <button className="config-btn danger" onClick={() => remove(d.id)}>Clear</button>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
