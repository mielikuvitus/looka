// juan — the bee's voice loop (client side). Owner: juan (gentle default).
//
// Push-to-talk against POST /api/bee/voice: record the mic with MediaRecorder,
// send one multipart blob, get { transcript, connector, reply, audio } back,
// play the mp3. Batch on purpose — the connector agent genuinely works for
// 10–60s, so the honest shape is record → thinking → speaking, not a realtime
// stream (that's Frank's orb; different feature).
//
// The hook owns the voice state machine; pass `onBeeState` to mirror the
// states onto the 3D bee (useBeeLaunch().setBeeState).

import type { BeeVoiceResponse } from '../../shared/api-types'
import { useCallback, useEffect, useRef, useState } from 'react'

export type BeeVoiceState = 'idle' | 'listening' | 'thinking' | 'speaking'

/** How long we give the whole round trip (agent work included). */
const VOICE_TIMEOUT_MS = 120_000

export interface UseBeeVoiceOptions {
  /** Mirror voice states onto the 3D bee ('listening' maps to 'idle'). */
  onBeeState?: (state: 'idle' | 'thinking' | 'speaking') => void
}

export function useBeeVoice({ onBeeState }: UseBeeVoiceOptions = {}) {
  const [state, setState] = useState<BeeVoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [reply, setReply] = useState('')
  const [connector, setConnector] = useState<string | null>(null)
  const [error, setError] = useState('')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const playerRef = useRef<HTMLAudioElement | null>(null)

  const enter = useCallback((next: BeeVoiceState) => {
    setState(next)
    // The bee has no 'listening' clip — it sits attentively in 'idle'.
    onBeeState?.(next === 'listening' ? 'idle' : next)
  }, [onBeeState])

  const startListening = useCallback(async () => {
    setError('')
    setTranscript('')
    setReply('')
    setConnector(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Prefer webm/opus; Safari/visionOS-style engines record audio/mp4.
      // Either way the backend STT accepts the container we name honestly.
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : undefined
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0)
          chunksRef.current.push(e.data)
      }
      recorderRef.current = recorder
      recorder.start()
      enter('listening')
    }
    catch (err) {
      console.error('[bee-voice] mic unavailable:', err)
      setError('Microphone unavailable — check permissions.')
      enter('idle')
    }
  }, [enter])

  const stopAndSend = useCallback(async () => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive')
      return
    enter('thinking')

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach(t => t.stop())
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }))
      }
      recorder.stop()
    })
    recorderRef.current = null

    const form = new FormData()
    const ext = blob.type.includes('mp4') ? 'm4a' : 'webm'
    form.append('audio', blob, `ask.${ext}`)

    try {
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), VOICE_TIMEOUT_MS)
      const res = await fetch('/api/bee/voice', {
        method: 'POST',
        body: form,
        signal: controller.signal,
      })
      window.clearTimeout(timer)

      const data = await res.json() as BeeVoiceResponse & { error?: string }
      if (!res.ok) {
        setError(data.error ?? `voice request failed (${res.status})`)
        enter('idle')
        return
      }

      setTranscript(data.transcript)
      setReply(data.reply)
      setConnector(data.connector)

      if (data.audio) {
        const player = new Audio(`data:${data.audioType};base64,${data.audio}`)
        playerRef.current = player
        enter('speaking')
        player.onended = () => enter('idle')
        player.onerror = () => enter('idle')
        await player.play().catch((err) => {
          console.error('[bee-voice] playback failed:', err)
          enter('idle')
        })
      }
      else {
        // TTS hiccup — the text reply still stands, just nothing to play.
        enter('idle')
      }
    }
    catch (err) {
      console.error('[bee-voice] round trip failed:', err)
      setError(err instanceof DOMException && err.name === 'AbortError'
        ? 'The bee took too long — try again.'
        : 'Could not reach the bee — is the backend up?')
      enter('idle')
    }
  }, [enter])

  /** One button: idle → listen, listening → send. Ignored while busy. */
  const toggle = useCallback(() => {
    if (state === 'idle')
      void startListening()
    else if (state === 'listening')
      void stopAndSend()
  }, [state, startListening, stopAndSend])

  // Leaving the page mid-flight: stop the mic and the player.
  useEffect(() => () => {
    recorderRef.current?.stream.getTracks().forEach(t => t.stop())
    playerRef.current?.pause()
  }, [])

  return { state, transcript, reply, connector, error, toggle }
}
