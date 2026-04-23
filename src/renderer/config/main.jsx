import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './config.css'
import ConfigApp from './ConfigApp'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigApp />
  </StrictMode>
)
