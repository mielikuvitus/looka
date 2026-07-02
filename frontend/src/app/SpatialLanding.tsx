import { Model } from '@webspatial/react-sdk'
import { useBeeLaunch } from '../features/juan/useBeeLaunch'
import { useBeeVoice } from '../features/juan/useBeeVoice'
import './Room.css'
import './SpatialLanding.css'

const VOICE_LABEL = {
  idle: '🎙 Ask the bee',
  listening: '⏹ Listening — tap to send',
  thinking: 'The bee is working…',
  speaking: 'The bee is speaking…',
} as const

export function SpatialLanding() {
  const { status, message, handleMaterialize, setBeeState, isBusy, isErrorStatus } = useBeeLaunch()
  const voice = useBeeVoice({ onBeeState: setBeeState })

  return (
    <main className="scene-shell" enable-xr-monitor>
      <div className="scene-bg" aria-hidden="true" />

      <div className="scene-guides" aria-hidden="true">
        <span className="guide guide-ring"></span>
        <span className="guide guide-axis"></span>
        <span className="guide guide-horizon"></span>
      </div>

      {isErrorStatus && (
        <div className="spatial-error-bar">{message}</div>
      )}

      <div className="spatial-landing-stack">
        <div className="spatial-logo-row">
          <Model
            enable-xr
            src="/models/looka-pink.glb"
            className="spatial-logo-model"
            style={{ 'width': '220px', 'height': '110px', '--xr-depth': '60px' } as React.CSSProperties}
          />
          <Model
            enable-xr
            src="/models/icon.glb"
            className="spatial-icon-model"
            style={{ 'width': '64px', 'height': '64px', '--xr-depth': '60px' } as React.CSSProperties}
          />
        </div>

        <div className="spatial-landing-panel">
          <div className="spatial-landing-headline" role="heading" aria-label="Welcome to Looka!">
            <Model
              enable-xr
              src="/models/Welcome-to.glb"
              className="spatial-headline-model"
              style={{ 'width': '200px', 'height': '56px', '--xr-depth': '20px' } as React.CSSProperties}
            />
            <Model
              enable-xr
              src="/models/looka-pink.glb"
              className="spatial-headline-model"
              style={{ 'width': '140px', 'height': '56px', '--xr-depth': '20px' } as React.CSSProperties}
            />
            <Model
              enable-xr
              src="/models/exclamation.glb"
              className="spatial-headline-model"
              style={{ 'width': '28px', 'height': '56px', '--xr-depth': '20px' } as React.CSSProperties}
            />
          </div>

          <p className="spatial-landing-subheading">Your agent workflow visualiser</p>

          <button
            type="button"
            className={`spatial-landing-cta${isBusy ? ' is-busy' : ''}`}
            onClick={() => handleMaterialize('immersive-ar')}
            disabled={isBusy}
          >
            {status === 'starting' ? 'Starting…' : 'Tap to meet your first assistant!'}
          </button>

          <button
            type="button"
            className={`bee-voice-cta is-${voice.state}`}
            onClick={voice.toggle}
            disabled={voice.state === 'thinking' || voice.state === 'speaking'}
          >
            {VOICE_LABEL[voice.state]}
          </button>

          {(voice.transcript || voice.error) && (
            <div className="bee-voice-panel">
              {voice.transcript && (
                <p className="bee-voice-transcript">
                  “
                  {voice.transcript}
                  ”
                </p>
              )}
              {voice.connector && (
                <span className="bee-voice-chip">
                  →
                  {' '}
                  {voice.connector}
                </span>
              )}
              {voice.reply && <p className="bee-voice-reply">{voice.reply}</p>}
              {voice.error && <p className="bee-voice-error">{voice.error}</p>}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
