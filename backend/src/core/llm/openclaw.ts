// Thin OpenClaw client STUB — used by frank.
//
// OpenClaw is a gateway that fronts an agent/command-center. This is a
// deliberate placeholder: it reads OPENCLAW_TOKEN (and an optional gateway
// URL) from the environment and, when both are present, POSTs the prompt.
// If the token or gateway is missing, or the call fails, it degrades
// gracefully to a helpful placeholder instead of crashing.
//
// Wire the real gateway later — see
// misc/reference/external/webspatial_openclaw_command_center once pulled.

import process from 'node:process'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL ?? ''

/**
 * Ask OpenClaw for a short reply. Never throws.
 */
export async function askOpenClaw(prompt: string): Promise<{ text: string, ok: boolean }> {
  const token = process.env.OPENCLAW_TOKEN

  if (!token || !GATEWAY_URL) {
    return {
      ok: false,
      text: '[OpenClaw placeholder] Set OPENCLAW_TOKEN and OPENCLAW_GATEWAY_URL in .env to reach the real gateway.',
    }
  }

  try {
    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt }),
    })

    if (!res.ok)
      return { ok: false, text: `[OpenClaw error] Gateway returned ${res.status}.` }

    // The real gateway shape is TBD; accept a few common fields.
    const data = await res.json() as { text?: string, message?: string, output?: string }
    const text = data.text ?? data.message ?? data.output ?? '(empty reply)'
    return { ok: true, text }
  }
  catch (err) {
    console.error('[openclaw] request failed:', err)
    return { ok: false, text: '[OpenClaw error] Could not reach the gateway.' }
  }
}
