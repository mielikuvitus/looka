// frank — OpenClaw agent. Owner: frank (gentle default; edit freely).

import type { PingResponse } from '../../contract'
import { Hono } from 'hono'
import { askOpenClaw } from '../../core/llm/openclaw'
import { realtimeToken } from './realtime-token'

const PROMPT = 'You are frank, a helpful spatial-web agent. Say hello in one short sentence.'

export const frank = new Hono()

frank.post('/ping', async (c) => {
  const { text, ok } = await askOpenClaw(PROMPT)
  const body: PingResponse = { member: 'frank', message: text, ok }
  return c.json(body)
})

// Voice orb: mint a short-lived OpenAI Realtime key for the browser.
frank.post('/realtime-token', realtimeToken)
