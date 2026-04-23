import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './hud.css'
import HudRoot from './HudRoot'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HudRoot />
  </StrictMode>
)
