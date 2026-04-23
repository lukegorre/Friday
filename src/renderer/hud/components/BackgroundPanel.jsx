import { motion } from 'framer-motion'

function fmt(ms) {
  if (!ms) return '0:00'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function BackgroundPanel({ discord, spotify, volume, brightness, outputAlias, inputAlias }) {
  const mic = discord?.micMuted
  const deaf = discord?.deafened
  const inVoice = discord?.inVoice

  const progress = spotify?.duration ? spotify.progress / spotify.duration : 0

  return (
    <motion.div
      className="bg-panel"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
    >
      <div className="bg-grid">
        {/* Discord */}
        <div className="bg-widget">
          <div className="bg-widget-title">Discord</div>
          {inVoice ? (
            <div className="discord-state">
              <span className={`discord-indicator ${mic ? 'muted' : 'live'}`}>
                {mic ? 'MUTED' : 'LIVE'}
              </span>
              {deaf && <span className="discord-indicator deafened">DEAF</span>}
            </div>
          ) : (
            <div className="bg-status-label">Not in voice</div>
          )}
          {discord?.channelName && (
            <div className="bg-status-label" style={{ marginTop: 6 }}>{discord.channelName}</div>
          )}
        </div>

        {/* Spotify */}
        <div className="bg-widget">
          <div className="bg-widget-title">Spotify</div>
          {spotify?.name ? (
            <>
              <div className="spotify-track">{spotify.name}</div>
              <div className="spotify-artist">{spotify.artist}</div>
              <div className="spotify-progress-bar">
                <div className="spotify-progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{fmt(spotify.progress)}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{fmt(spotify.duration)}</span>
              </div>
            </>
          ) : (
            <div className="bg-status-label">Not playing</div>
          )}
        </div>

        {/* Audio routing */}
        <div className="bg-widget">
          <div className="bg-widget-title">Audio</div>
          <div className="bg-status-label">Out: {outputAlias || '—'}</div>
          <div className="bg-status-label" style={{ marginTop: 4 }}>In: {inputAlias || '—'}</div>
        </div>

        {/* System */}
        <div className="bg-widget">
          <div className="bg-widget-title">System</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div className="bg-status-value">{volume != null ? `${volume}%` : '—'}</div>
              <div className="bg-status-label">Volume</div>
            </div>
            <div>
              <div className="bg-status-value">{brightness != null ? `${brightness}%` : '—'}</div>
              <div className="bg-status-label">Brightness</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-footer">
        <div className="bg-footer-item">{volume != null ? `${volume}% vol` : '— vol'}</div>
        <div className="bg-footer-item">{brightness != null ? `${brightness}% bright` : '— bright'}</div>
        <div className="bg-footer-item">{outputAlias || '—'}</div>
      </div>
    </motion.div>
  )
}
