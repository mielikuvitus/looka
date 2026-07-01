import { Model } from '@webspatial/react-sdk'
import { useState } from 'react'
import { FrankCard } from '../features/frank/FrankCard'
import { JoeCard } from '../features/joe/JoeCard'
import { JuanCard } from '../features/juan/JuanCard'
import { SuviCard } from '../features/suvi/SuviCard'
import { useSpatialDrag } from '../shared/composables/useSpatialDrag'
import './Room.css'

// The room shell: common ground, no owner. It holds the spatial scene —
// enable-xr surfaces, draggable agent panels, and Juan's 3D diorama.
export function Room() {
  const [showDiorama, setShowDiorama] = useState(false)
  const dioramaDrag = useSpatialDrag('rotateY(-4deg) rotateX(2deg)')

  return (
    <main className="scene-shell" enable-xr-monitor>
      <div className="scene-bg" aria-hidden="true" />
      <div className="agent-launcher">
        <button
          type="button"
          className="create-agent-button"
          onClick={() => setShowDiorama(true)}
        >
          Create agent
        </button>
      </div>

      <div className="scene-guides" aria-hidden="true">
        <span className="guide guide-ring"></span>
        <span className="guide guide-axis"></span>
        <span className="guide guide-horizon"></span>
      </div>

      <div className="agent-grid">
        <FrankCard />
        <JuanCard />
        <SuviCard />
        <JoeCard />
      </div>

      {showDiorama && (
        <section className="panel panel-diorama" enable-xr {...dioramaDrag}>
          <Model
            enable-xr
            src="/models/diorama.usdz"
            style={{ 'width': '100%', 'height': '220px', '--xr-depth': '220px' }}
          />
        </section>
      )}
    </main>
  )
}
