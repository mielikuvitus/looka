// Looka playground — synthesized UI sounds for the voice loop. No asset
// files: every blip/chime/buzz is a short Web Audio oscillator envelope.
//
// One shared AudioContext, created and resumed inside the FIRST orb tap
// (autoplay policy: a context born outside a user gesture stays suspended on
// mobile/PICO, so the reply audio would be silently blocked later — see the
// handoff gotchas). All other calls are no-ops until unlockAudio() has run.

export type SoundKind = 'start' | 'stop' | 'chime' | 'buzz'

let ctx: AudioContext | null = null

/**
 * Create + resume the AudioContext. MUST be called synchronously inside a
 * user gesture (the first orb tap). Safe to call repeatedly; later calls
 * just re-resume. Silently no-op on browsers with no Web Audio.
 */
export function unlockAudio(): void {
  if (ctx) {
    void ctx.resume()
    return
  }
  const Ctor = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor)
    return
  ctx = new Ctor()
  void ctx.resume()
  // A zero-length silent buffer satisfies the strictest autoplay unlockers
  // (some platforms require an actual buffer source start, not just resume).
  const buffer = ctx.createBuffer(1, 1, 22050)
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.connect(ctx.destination)
  src.start()
}

/** Play one UI sound. Silently no-ops before unlockAudio() or after close. */
export function playTone(kind: SoundKind): void {
  const c = ctx
  if (!c || c.state === 'closed')
    return
  const now = c.currentTime
  if (kind === 'start') {
    // Rising two-tone — recording begins.
    tone(c, 520, now, 0.09, 'sine', 0.12)
    tone(c, 780, now + 0.09, 0.09, 'sine', 0.12)
  }
  else if (kind === 'stop') {
    // Falling tone — recording ends, sending.
    tone(c, 780, now, 0.09, 'sine', 0.12)
    tone(c, 520, now + 0.09, 0.12, 'sine', 0.12)
  }
  else if (kind === 'chime') {
    // Soft ding right before the reply audio plays.
    tone(c, 880, now, 0.18, 'sine', 0.14)
    tone(c, 1320, now + 0.02, 0.22, 'sine', 0.07)
  }
  else {
    // Low harsh buzz — the error flash.
    tone(c, 150, now, 0.22, 'sawtooth', 0.16)
  }
}

/** One oscillator with a quick attack/decay envelope, started at `start`. */
function tone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  peak: number,
): void {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  // exponentialRampToValueAtTime refuses 0, so start just above it.
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(gain).connect(c.destination)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}
