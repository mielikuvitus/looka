// Looka playground — the bee's voice loop (plain TS, no React). Push-to-talk
// against POST /api/bee/voice: tap the orb to record, tap again to send; the
// orb reflects the loop's state and the bee mirrors thinking/speaking.
//
// The logic is lifted from features/juan/useBeeVoice.ts (COPIED, not
// imported — that file is a React hook and the playground is React-free per
// main.ts / the handoff constraints). The blocking /voice round trip is
// replaced by a job+poll split in slice 3; this slice keeps it blocking.
//
// Audio unlock + all UI sounds live in sounds.ts. The first tap both
// unlocks the AudioContext (autoplay policy) and requests the mic
// (getUserMedia — also gesture-gated on some browsers).

import type { BeeExpressionController } from '../features/juan/beeExpressions'
import type { MicOrb } from './micOrb'
import { playTone, unlockAudio } from './sounds'

const VOICE_TIMEOUT_MS = 120_000
// While waiting on a long job, the bee drops to idle for a glance every
// ~50s, then back to Think — pure life, the orbiting dots are the real
// "still running" signal (handoff decision c).
const GLANCE_INTERVAL_MS = 50_000
const GLANCE_DURATION_MS = 2500

export interface VoiceLoopOptions {
  orb: MicOrb
  controller: BeeExpressionController
  /**
   * Read-back surface for the STT transcript (decision b) and error copy.
   * null on surfaces with no DOM (AR until slice 3's in-scene bubble lands).
   */
  statusEl?: HTMLElement | null
}

export interface VoiceLoop {
  /** One tap: idle→record, recording→send. Ignored while busy (no cancel). */
  tap: () => void
  /** Stop the mic, the player, and the glance timer. Idempotent. */
  dispose: () => void
  /**
   * Subscribe to phase changes; fires once immediately with the current phase.
   * Returns an unsubscribe fn. Used by the phone overlay's Talk button.
   */
  onPhase: (cb: (phase: Phase) => void) => () => void
}

// The /voice response shape (copied from shared/api-types — do not import it
// across the playground boundary, per the handoff constraints).
interface BeeVoiceResponse {
  ok: boolean
  transcript: string
  connector: string | null
  reply: string
  audio: string | null
  audioType: string
}

export type Phase = 'idle' | 'recording' | 'working' | 'speaking'

export function createVoiceLoop(options: VoiceLoopOptions): VoiceLoop {
  const { orb, controller, statusEl = null } = options

  let phase: Phase = 'idle'
  const phaseSubs = new Set<(p: Phase) => void>()
  let recorder: MediaRecorder | null = null
  let chunks: Blob[] = []
  let player: HTMLAudioElement | null = null
  let glanceInterval: ReturnType<typeof setInterval> | null = null
  let glanceTimeout: ReturnType<typeof setTimeout> | null = null

  function setStatus(text: string) {
    if (statusEl)
      statusEl.textContent = text
  }

  // Map a phase onto the orb + the bee. The bee has no 'recording'/'working'
  // clip, so recording is attentive idle and working is the Think clip.
  function applyPhase(next: Phase) {
    phase = next
    for (const cb of phaseSubs) cb(next)
    if (next === 'idle') {
      orb.setState('idle')
      controller.setState('idle')
      clearGlance()
    }
    else if (next === 'recording') {
      orb.setState('recording')
      controller.setState('idle')
    }
    else if (next === 'working') {
      orb.setJobCount(1) // one orbiting dot per running job (slice 3 raises this)
      orb.setState('working')
      controller.setState('thinking')
      startGlance()
    }
    else {
      // speaking
      orb.setState('speaking')
      controller.setState('speaking')
    }
  }

  function startGlance() {
    clearGlance()
    glanceInterval = setInterval(() => {
      controller.setState('idle')
      glanceTimeout = setTimeout(() => controller.setState('thinking'), GLANCE_DURATION_MS)
    }, GLANCE_INTERVAL_MS)
  }

  function clearGlance() {
    if (glanceInterval) {
      clearInterval(glanceInterval)
      glanceInterval = null
    }
    if (glanceTimeout) {
      clearTimeout(glanceTimeout)
      glanceTimeout = null
    }
  }

  function fail(reason: string) {
    console.error('[voice] round trip failed:', reason)
    orb.flashError()
    playTone('buzz')
    setStatus('Couldn\u2019t reach the hive \u2014 tap to retry.')
    applyPhase('idle')
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Prefer webm/opus; Safari/visionOS-style engines record audio/mp4.
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : undefined
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunks = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0)
          chunks.push(e.data)
      }
      recorder.start()
      playTone('start')
      applyPhase('recording')
    }
    catch (err) {
      console.error('[voice] mic unavailable:', err)
      const denied = err instanceof DOMException
        && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
      orb.flashError()
      playTone('buzz')
      setStatus(denied
        ? 'The bee needs your mic — allow it, then tap to talk.'
        : 'No microphone found — tap to retry.')
      applyPhase('idle')
    }
  }

  function stopAndSend() {
    const r = recorder
    if (!r || r.state === 'inactive')
      return
    applyPhase('working')
    playTone('stop')
    r.onstop = () => {
      r.stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(chunks, { type: r.mimeType || 'audio/webm' })
      void sendBlob(blob)
    }
    r.stop()
    recorder = null
  }

  async function sendBlob(blob: Blob) {
    const form = new FormData()
    const ext = blob.type.includes('mp4') ? 'm4a' : 'webm'
    form.append('audio', blob, `ask.${ext}`)

    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), VOICE_TIMEOUT_MS)
    try {
      const res = await fetch('/api/bee/voice', {
        method: 'POST',
        body: form,
        signal: abort.signal,
      })
      const data = await res.json() as BeeVoiceResponse & { error?: string }
      clearTimeout(timer)
      if (!res.ok || !data.ok) {
        fail(data.error ?? `voice request failed (${res.status})`)
        return
      }
      // Read-back receipt: show what the bee heard before the (long) wait.
      // Skip empty transcripts so the shared #ar-hint pill isn't left blank.
      if (data.transcript)
        setStatus(`\u201c${data.transcript}\u201d`)
      if (data.audio)
        playReply(data.audio, data.audioType || 'audio/mpeg')
      else
        applyPhase('idle')
    }
    catch (err) {
      clearTimeout(timer)
      const msg = err instanceof DOMException && err.name === 'AbortError'
        ? 'the bee took too long'
        : 'network error'
      fail(msg)
    }
  }

  async function playReply(b64: string, mime: string) {
    player = new Audio(`data:${mime};base64,${b64}`)
    playTone('chime')
    applyPhase('speaking')
    player.onended = () => applyPhase('idle')
    player.onerror = () => fail('playback failed')
    try {
      await player.play()
    }
    catch (err) {
      console.error('[voice] playback blocked:', err)
      fail('playback blocked')
    }
  }

  function tap() {
    if (phase === 'idle') {
      unlockAudio() // must run inside the gesture (autoplay policy)
      void startRecording()
    }
    else if (phase === 'recording') {
      stopAndSend()
    }
    // 'working' / 'speaking' → no-op (no cancel — handoff decision a)
  }

  function onPhase(cb: (p: Phase) => void) {
    phaseSubs.add(cb)
    cb(phase) // initialize the subscriber with the current phase
    return () => {
      phaseSubs.delete(cb)
    }
  }

  function dispose() {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stream.getTracks().forEach(t => t.stop())
      try {
        recorder.stop()
      }
      catch {
        // shutting down — ignore
      }
    }
    recorder = null
    if (player) {
      player.pause()
      player = null
    }
    clearGlance()
    phaseSubs.clear()
  }

  return { tap, dispose, onPhase }
}
