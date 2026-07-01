// Tiny OpenAI Realtime wrapper — mints a short-lived client secret so the
// browser can open a WebRTC voice session directly with OpenAI. The real
// OPENAI_API_KEY never leaves the server.
//
// Mirrors core/llm/openai.ts: it never throws. On a missing key or a failed
// call it returns a tagged result so the route can degrade gracefully (the
// orb shows a disabled state instead of crashing the room).

import process from 'node:process'

// Speech-to-speech model for the voice orb. Override with OPENAI_REALTIME_MODEL.
// Use `||` not `??`: docker-compose passes an empty string when the var is
// unset (`${OPENAI_REALTIME_MODEL:-}`), and we want that to fall back too.
const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2'
const VOICE = 'alloy'

// Frank's persona, embedded in the minted session. The frontend re-asserts the
// same instructions over the data channel once the session opens.
const FRANK_INSTRUCTIONS = `You are Frank's voice agent inside Looka, a spatial room of floating AI agents. Speak warmly and naturally, like a helpful colleague standing beside the user. Keep replies to one or two sentences — they are spoken aloud, not read. If you are unsure, say so briefly.`

export type MintResult =
  | { ok: true, token: string, expiresAt: number, model: string }
  | { ok: false, reason: string }

/**
 * Ask OpenAI for an ephemeral client secret. Never throws — any problem comes
 * back as `{ ok: false, reason }` so the caller can answer without a stack trace.
 */
export async function mintClientSecret(): Promise<MintResult> {
  const key = process.env.OPENAI_API_KEY
  if (!key)
    return { ok: false, reason: 'no-key' }

  try {
    const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: REALTIME_MODEL,
          instructions: FRANK_INSTRUCTIONS,
          audio: {
            input: { turn_detection: { type: 'server_vad' } },
            output: { voice: VOICE },
          },
        },
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[realtime] mint failed:', res.status, detail)
      return { ok: false, reason: `openai-${res.status}` }
    }

    const data = await res.json() as { value?: string, expires_at?: number }
    if (!data.value)
      return { ok: false, reason: 'no-token' }

    return { ok: true, token: data.value, expiresAt: data.expires_at ?? 0, model: REALTIME_MODEL }
  }
  catch (err) {
    console.error('[realtime] mint error:', err)
    return { ok: false, reason: 'request-failed' }
  }
}
