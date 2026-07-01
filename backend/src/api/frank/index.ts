// frank — OpenClaw agent. Owner: frank (gentle default; edit freely).

import type { PingResponse } from '../../contract'
import { Hono } from 'hono'
import { askOpenClaw } from '../../core/llm/openclaw'

const PROMPT = 'You are frank, a helpful spatial-web agent. Say hello in one short sentence.'

export const frank = new Hono()

frank.post('/ping', async (c) => {
  const { text, ok } = await askOpenClaw(PROMPT)
  const body: PingResponse = { member: 'frank', message: text, ok }
  return c.json(body)
})
