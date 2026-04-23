import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './test-panel.css'
import TestPanel from './TestPanel'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TestPanel />
  </StrictMode>
)
