// Tiny OpenAI wrapper — used by juan, suvi, and joe.
//
// Reads OPENAI_API_KEY from the environment. If the key is missing (or the
// call fails), we return a clear placeholder string instead of crashing, so
// the room stays usable during the hackathon without real credentials.

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
      max_tokens: 120,
    })
    const text = res.choices[0]?.message?.content?.trim()
    return { ok: true, text: text || '(empty reply)' }
  }
  catch (err) {
    console.error('[openai] request failed:', err)
    return { ok: false, text: '[OpenAI error] The request failed — check the key and try again.' }
  }
}
