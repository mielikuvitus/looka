import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WeatheryWindow } from './features/juan/WeatheryWindow'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WeatheryWindow />
  </StrictMode>,
)
