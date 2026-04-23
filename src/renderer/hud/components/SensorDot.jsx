export default function SensorDot({ status }) {
  const color = {
    connected:    'var(--dot-green)',
    degraded:     'var(--dot-amber)',
    disconnected: 'var(--dot-red)'
  }[status] || 'var(--dot-red)'

  return <div className="sensor-dot" style={{ background: color }} />
}
