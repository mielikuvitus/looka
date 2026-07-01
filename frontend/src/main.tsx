import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Room } from './app/Room'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Room />
  </StrictMode>,
)
