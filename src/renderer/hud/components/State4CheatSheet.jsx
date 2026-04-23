import { motion } from 'framer-motion'

const HARDWIRED_ROWS = [
  { name: 'Wrist Shoo', desc: 'Relaxed hand, quick outward wrist flick', action: 'Summon / Banish HUD' },
  { name: 'Peace Sign (hold 600ms)', desc: 'Index + middle spread', action: 'Gesture Reference' },
  { name: 'Open Palm', desc: 'All fingers flat, palm forward', action: 'Mute / Unmute' },
  { name: 'Snap to Fist', desc: 'Open hand rapidly closing', action: 'Minimize Window' },
]

const GLOBAL_ROWS = [
  { name: 'Flick Right', desc: 'Index + middle, quick right flick', action: 'Next App' },
  { name: 'Flick Left',  desc: 'Index + middle, quick left flick',  action: 'Previous App' },
  { name: 'Flick Up',    desc: 'Index + middle, quick up flick',    action: 'Maximize Window' },
  { name: 'Flick Down',  desc: 'Index + middle, quick down flick',  action: 'Minimize Window' },
  { name: 'Pinch (hold 500ms)', desc: 'Thumb + index tips together', action: 'Close Window' },
  { name: 'Gun Shape',   desc: 'Thumb + index extended', action: 'Task View' },
  { name: 'Hang Loose',  desc: 'Thumb + pinky extended', action: 'Show Desktop' },
  { name: 'Twist Right', desc: 'Index point, wrist CW', action: 'Next Virtual Desktop' },
  { name: 'Twist Left',  desc: 'Index point, wrist CCW', action: 'Previous Desktop' },
  { name: 'Thumbs Up',   desc: 'Fist, thumb up', action: 'Volume Up' },
  { name: 'Thumbs Down', desc: 'Fist, thumb down', action: 'Volume Down' },
]

const MODIFIER_ROWS = [
  { name: 'Left Hand Still + Flick Right', desc: 'Left hand held still in zone', action: 'Snap Window Right' },
  { name: 'Left Hand Still + Flick Left',  desc: '', action: 'Snap Window Left' },
  { name: 'Left Hand Still + Flick Up',    desc: '', action: 'Move to Next Monitor' },
  { name: 'Left Hand Still + Thumbs Up',   desc: '', action: 'Brightness Up' },
  { name: 'Left Hand Still + Thumbs Down', desc: '', action: 'Brightness Down' },
]

export default function State4CheatSheet({ profile }) {
  function close() {
    if (window.electronAPI?.closeCheatSheet) window.electronAPI.closeCheatSheet()
  }

  return (
    <motion.div
      className="cheat-sheet-overlay"
      style={{ pointerEvents: 'auto' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="cheat-sheet-panel"
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
            Gesture Reference
          </span>
          <button
            onClick={close}
            style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6, color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, lineHeight: 1, padding: '4px 9px',
              pointerEvents: 'auto'
            }}
          >
            ✕
          </button>
        </div>

        <CheatSection title="Always Active" rows={HARDWIRED_ROWS} />
        <CheatSection title="Right Hand" rows={GLOBAL_ROWS} />
        <CheatSection title="Modifier (Left Hand Still)" rows={MODIFIER_ROWS} />
      </motion.div>
    </motion.div>
  )
}

function CheatSection({ title, rows }) {
  return (
    <>
      <div className="cheat-section-title">{title}</div>
      {rows.map((row, i) => (
        <div className="cheat-row" key={i}>
          <div className="cheat-gesture-col">
            <div className="cheat-gesture-name">{row.name}</div>
            {row.desc && <div className="cheat-gesture-desc">{row.desc}</div>}
          </div>
          <div className="cheat-action">{row.action}</div>
        </div>
      ))}
    </>
  )
}
