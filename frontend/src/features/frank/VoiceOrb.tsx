import type { VoiceState } from './useRealtimeVoice'
import styles from './VoiceOrb.module.css'

// Presentational only — all logic lives in useRealtimeVoice. The orb reads its
// look from `state` via a data-attribute the CSS module keys off.
interface VoiceOrbProps {
  state: VoiceState
  onTap: () => void
}

const CAPTIONS: Record<VoiceState, string> = {
  idle: 'Tap to start speaking',
  connecting: 'Connecting…',
  listening: 'Listening…',
  speaking: 'Speaking…',
  disabled: 'Voice unavailable — set OPENAI_API_KEY',
  error: 'Something went wrong — tap to retry',
}

export function VoiceOrb({ state, onTap }: VoiceOrbProps) {
  const live = state === 'listening' || state === 'speaking'

  return (
    <div className={styles.stage} data-state={state}>
      <div className={styles.orbFrame}>
        <span className={styles.ring} />
        <span className={styles.ring} />
        <span className={styles.ring} />
        <button
          type="button"
          className={styles.orbBtn}
          onClick={onTap}
          disabled={state === 'disabled'}
          aria-label={live ? 'Stop talking' : 'Start talking'}
        >
          <span className={styles.orb} />
          <svg
            className={styles.mic}
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
          <span className={styles.wave}>
            <span />
            <span />
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>
      <p className={styles.caption}>{CAPTIONS[state]}</p>
    </div>
  )
}
