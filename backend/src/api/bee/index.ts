// The bee — the single orchestrator endpoint the room talks to.
//
// One mic, one voice: POST a transcript here, the bee decides which connector
// (claimsboard, …) handles it, forwards it through OpenClaw, and returns the
// reply. Text-first on purpose — audio (STT/TTS) wraps this later.

import { Hono } from 'hono'
import { orchestrate } from '../../core/orchestrator'

export const bee = new Hono()

bee.post('/ask', async (c) => {
  const body = await c.req.json().catch(() => ({} as { message?: unknown }))
  const message = body?.message
  if (typeof message !== 'string' || message.trim().length === 0)
    return c.json({ ok: false, error: 'expected { message: string }' }, 400)

  const r = await orchestrate(message)
  return c.json({ ok: r.ok, connector: r.connector, reply: r.reply })
})
