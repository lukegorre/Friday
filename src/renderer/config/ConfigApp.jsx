import { useState } from 'react'
import DeviceAliases from './components/DeviceAliases'
import GestureRemaps from './components/GestureRemaps'
import ProfileManager from './components/ProfileManager'
import SpotifyAuth from './components/SpotifyAuth'

const NAV = [
  { id: 'devices',   label: 'Device Aliases' },
  { id: 'gestures',  label: 'Gesture Remaps' },
  { id: 'profiles',  label: 'Profiles' },
  { id: 'spotify',   label: 'Spotify' },
]

export default function ConfigApp() {
  const [active, setActive] = useState('devices')

  return (
    <div className="config-layout">
      <nav className="config-sidebar">
        <div className="sidebar-logo">FRIDAY</div>
        {NAV.map(n => (
          <div
            key={n.id}
            className={`sidebar-item ${active === n.id ? 'active' : ''}`}
            onClick={() => setActive(n.id)}
          >
            {n.label}
          </div>
        ))}
      </nav>
      <main className="config-content">
        {active === 'devices'  && <DeviceAliases />}
        {active === 'gestures' && <GestureRemaps />}
        {active === 'profiles' && <ProfileManager />}
        {active === 'spotify'  && <SpotifyAuth />}
      </main>
    </div>
  )
}
