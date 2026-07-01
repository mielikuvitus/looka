import type { RealtimeHandle } from './realtimeConnection'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FRANK_INSTRUCTIONS } from './prompt'
import { connectRealtime } from './realtimeConnection'

// The orb's whole lifecycle in one small state machine:
//   idle → connecting → listening ⇄ speaking, back to idle on stop.
// `disabled` means no OPENAI_API_KEY (graceful, not an error); `error` is a
// real failure the user can retry with a tap.
export type VoiceState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'disabled'
  | 'error'

interface TokenResponse {
  ok: boolean
  reason?: string
  token?: string
  model?: string
}

export function useRealtimeVoice() {
  const [state, setState] = useState<VoiceState>('idle')
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const handleRef = useRef<RealtimeHandle | null>(null)
  const stateRef = useRef<VoiceState>('idle')

  // Mirror state into a ref so data-channel callbacks read the latest value.
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const stop = useCallback(() => {
    handleRef.current?.stop()
    handleRef.current = null
    setState('idle')
    setError(null)
  }, [])

  const start = useCallback(async () => {
    setState('connecting')
    setError(null)
    try {
      const res = await fetch('/api/frank/realtime-token', { method: 'POST' })
      const data = await res.json() as TokenResponse

      if (!data.ok || !data.token) {
        // No key on the server → quietly disable rather than alarm the user.
        if (data.reason === 'no-key') {
          setState('disabled')
          return
        }
        setState('error')
        setError('Could not start the voice session.')
        return
      }

      const audioEl = audioRef.current
      if (!audioEl) {
        setState('error')
        setError('Audio output is unavailable.')
        return
      }

      handleRef.current = await connectRealtime({
        token: data.token,
        model: data.model || 'gpt-realtime-2',
        instructions: FRANK_INSTRUCTIONS,
        audioEl,
        onOpen: () => setState('listening'),
        onEvent: (event) => {
          switch (event.type) {
            // First audio chunk of a reply → the agent is speaking.
            case 'response.output_audio.delta':
              if (stateRef.current !== 'speaking')
                setState('speaking')
              break
            // Reply finished → back to listening for the next turn.
            case 'response.output_audio.done':
            case 'response.done':
              setState('listening')
              break
            case 'error':
              setState('error')
              setError('The voice session hit an error.')
              break
          }
        },
      })
    }
    catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Voice session failed.')
    }
  }, [])

  const toggle = useCallback(() => {
    const s = stateRef.current
    if (s === 'disabled')
      return
    if (s === 'idle' || s === 'error')
      void start()
    else
      stop()
  }, [start, stop])

  // Tear down any live session when the card unmounts.
  useEffect(() => {
    return () => {
      handleRef.current?.stop()
      handleRef.current = null
    }
  }, [])

  return { state, error, start, stop, toggle, audioRef }
}
