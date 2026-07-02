// The bee — the single orchestrator endpoint the room talks to.
//
// One mic, one voice. Two doors, one spine:
//   POST /ask    text in  → orchestrate → text out
//   POST /voice  audio in → STT → orchestrate (unchanged) → compose → TTS → audio out
// Audio exists only inside /voice's two bookends — the orchestrator, the
// gateway, and the connector agents all work on plain text.

import process from 'node:process'
import { Hono } from 'hono'
import { speak, transcribe } from '../../core/llm/openai'
import { composeSpoken, orchestrate } from '../../core/orchestrator'

export const bee = new Hono()

bee.post('/ask', async (c) => {
  const body = await c.req.json().catch(() => ({} as { message?: unknown }))
  const message = body?.message
  if (typeof message !== 'string' || message.trim().length === 0)
    return c.json({ ok: false, error: 'expected { message: string }' }, 400)

  const r = await orchestrate(message)
  return c.json({ ok: r.ok, connector: r.connector, reply: r.reply })
})

bee.post('/voice', async (c) => {
  // Unlike /ask (which routes keyword-only without credentials), voice hard-
  // requires OPENAI_API_KEY for both STT and TTS — fail loud and early.
  if (!process.env.OPENAI_API_KEY) {
    return c.json(
      { ok: false, error: 'voice needs OPENAI_API_KEY in .env (STT/TTS)' },
      503,
    )
  }

  const body = await c.req.parseBody().catch(() => ({} as Record<string, unknown>))
  const audio = body.audio
  if (!(audio instanceof File))
    return c.json({ ok: false, error: 'expected multipart form field "audio" (webm/m4a/mp3)' }, 400)

  const stt = await transcribe(audio)
  if (!stt.ok || stt.text.length === 0)
    return c.json({ ok: false, error: 'could not transcribe the audio' }, 422)

  const r = await orchestrate(stt.text) // the same spine /ask uses — unchanged
  const spoken = await composeSpoken(stt.text, r)
  const tts = await speak(spoken)

  return c.json({
    ok: r.ok,
    transcript: stt.text,
    connector: r.connector,
    reply: spoken,
    // base64 mp3, or null if synthesis failed — the client then shows text only.
    audio: tts.ok ? tts.audioBase64 : null,
    audioType: 'audio/mpeg',
  })
})
