import { useSpatialDrag } from '../../shared/composables/useSpatialDrag'
import { useRealtimeVoice } from './useRealtimeVoice'
import { VoiceOrb } from './VoiceOrb'

// Frank owns this feature (gentle default). A live voice agent: tap the orb and
// talk — OpenAI Realtime answers out loud over WebRTC. OpenClaw comes later.
export function FrankCard() {
  const drag = useSpatialDrag('rotateY(-6deg) rotateX(2deg)')
  const { state, toggle, audioRef } = useRealtimeVoice()

  return (
    <section className="panel agent-card" enable-xr {...drag}>
      <div className="surface-chip panel-tag" enable-xr>
        OpenAI Realtime
      </div>
      <h2 className="panel-title">Frank</h2>
      <p className="panel-copy">Tap the orb and talk — I answer out loud.</p>

      <VoiceOrb state={state} onTap={toggle} />
      { /* Assistant audio plays here; hidden, driven by the WebRTC track. */ }
      <audio ref={audioRef} autoPlay />
    </section>
  )
}
