// Tiny OpenAI wrapper — used by juan, suvi, and joe.
//
// Reads OPENAI_API_KEY from the environment. If the key is missing (or the
// call fails), we return a clear placeholder string instead of crashing, so
// the room stays usable during the hackathon without real credentials.

import { Buffer } from 'node:buffer'
import process from 'node:process'
import OpenAI from 'openai'

// Cheap model on purpose — this is a demo, not a product.
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.4-mini'

let client: OpenAI | null = null

function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY
  if (!key)
    return null
  client ??= new OpenAI({ apiKey: key })
  return client
}

/**
 * Ask OpenAI for a short reply. Never throws — on any problem it returns a
 * human-readable placeholder so the caller can always respond `ok: false`
 * without a stack trace reaching the user.
 */
export async function askOpenAI(prompt: string): Promise<{ text: string, ok: boolean }> {
  const openai = getClient()
  if (!openai) {
    return {
      ok: false,
      text: '[OpenAI placeholder] No OPENAI_API_KEY set — add one to .env to get real replies.',
    }
  }

  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      // Newer models (gpt-5.x) require max_completion_tokens, not max_tokens.
      max_completion_tokens: 120,
    })
    const text = res.choices[0]?.message?.content?.trim()
    return { ok: true, text: text || '(empty reply)' }
  }
  catch (err) {
    console.error('[openai] request failed:', err)
    return { ok: false, text: '[OpenAI error] The request failed — check the key and try again.' }
  }
}

// --- Voice bookends (used only by POST /api/bee/voice) ----------------------
// Audio exists ONLY here, at the two ends of the loop. Everything between —
// the orchestrator, the gateway, the connector agents — works on plain text.

const STT_MODEL = process.env.OPENAI_STT_MODEL ?? 'gpt-4o-mini-transcribe'
const TTS_MODEL = process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts'
const TTS_VOICE = process.env.OPENAI_TTS_VOICE ?? 'coral'

/**
 * Speech → text. Accepts the multipart `File` straight from Hono's
 * parseBody(). Never throws — `ok: false` with empty text on any problem.
 */
export async function transcribe(audio: File): Promise<{ text: string, ok: boolean }> {
  const openai = getClient()
  if (!openai)
    return { ok: false, text: '' }
  try {
    const res = await openai.audio.transcriptions.create({
      file: audio,
      model: STT_MODEL,
    })
    return { ok: true, text: res.text.trim() }
  }
  catch (err) {
    console.error('[openai] transcription failed:', err)
    return { ok: false, text: '' }
  }
}

/**
 * Text → mp3 (base64). Never throws — `ok: false` with empty audio on any
 * problem, so a TTS hiccup degrades to a text-only reply instead of a 500.
 */
export async function speak(text: string): Promise<{ audioBase64: string, ok: boolean }> {
  const openai = getClient()
  if (!openai)
    return { ok: false, audioBase64: '' }
  try {
    const res = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: text,
      response_format: 'mp3',
    })
    const buf = Buffer.from(await res.arrayBuffer())
    return { ok: true, audioBase64: buf.toString('base64') }
  }
  catch (err) {
    console.error('[openai] speech synthesis failed:', err)
    return { ok: false, audioBase64: '' }
  }
}
