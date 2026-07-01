// POST /api/frank/realtime-token — hands the browser a short-lived key for a
// WebRTC voice session. Owner: frank (gentle default; edit freely).

import type { Context } from 'hono'
import { mintClientSecret } from './openai-realtime'

export async function realtimeToken(c: Context) {
  const r = await mintClientSecret()

  if (!r.ok) {
    // `no-key` is an expected, non-error state: the room runs without creds
    // during the hackathon. Answer 200 so the orb degrades to "disabled"
    // rather than surfacing a scary error. Real failures get a 502.
    const status = r.reason === 'no-key' ? 200 : 502
    return c.json({ ok: false, reason: r.reason }, status)
  }

  return c.json({ ok: true, token: r.token, expiresAt: r.expiresAt, model: r.model })
}
