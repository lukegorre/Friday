import { useState, useEffect } from 'react'

export default function SpotifyAuth() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    refresh()
  }, [])

  function refresh() {
    const api = window.electronAPI
    if (!api) return
    api.spotifyAuthStatus().then(setStatus)
  }

  async function connect() {
    const api = window.electronAPI
    if (!api) return
    setLoading(true)
    try {
      const { url } = await api.spotifyAuthStart()
      // Main process opens browser; we wait for the callback to land
      // Poll for status every 2s for up to 60s
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        const s = await api.spotifyAuthStatus()
        if (s.connected) {
          setStatus(s)
          clearInterval(poll)
          setLoading(false)
        } else if (attempts >= 30) {
          clearInterval(poll)
          setLoading(false)
        }
      }, 2000)
    } catch {
      setLoading(false)
    }
  }

  async function revoke() {
    const api = window.electronAPI
    if (!api) return
    await api.spotifyAuthRevoke()
    refresh()
  }

  return (
    <>
      <div className="config-section-title">Spotify</div>
      <div className="config-section-desc">
        Connect your Spotify account to enable track display in the HUD and gesture-based playback control in Layer 3.
        Uses PKCE OAuth — no password is stored.
      </div>

      <div className="config-card">
        <div className="config-row">
          <div style={{ flex: 1 }}>
            <div className="config-row-label">Connection Status</div>
            {status?.connected && status?.displayName && (
              <div className="config-row-sub">Signed in as {status.displayName}</div>
            )}
          </div>
          <span className={`status-badge ${status?.connected ? 'connected' : 'disconnected'}`}>
            {status?.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="config-row">
          <div className="config-row-label" style={{ flex: 1 }}>
            {status?.connected ? 'Revoke access and disconnect' : 'Authorize Friday to access Spotify'}
          </div>
          {status?.connected ? (
            <button className="config-btn danger" onClick={revoke}>Disconnect</button>
          ) : (
            <button className="config-btn primary" onClick={connect} disabled={loading}>
              {loading ? 'Waiting…' : 'Connect Spotify'}
            </button>
          )}
        </div>
      </div>

      <div className="config-card" style={{ marginTop: 16 }}>
        <div className="config-row">
          <div>
            <div className="config-row-label">Layer 3 controls</div>
            <div className="config-row-sub">Play/Pause · Next · Previous · Volume (Dial rotate)</div>
          </div>
        </div>
        <div className="config-row">
          <div>
            <div className="config-row-label">HUD display</div>
            <div className="config-row-sub">Track name, artist, volume %, progress bar — updates every 3s while Layer 3 is active</div>
          </div>
        </div>
      </div>
    </>
  )
}
