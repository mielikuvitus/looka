// juan — OpenAI agent. Owner: juan (gentle default; edit freely).

import type { PingRequest, PingResponse } from '../../contract'
import { Hono } from 'hono'
import { askOpenAI } from '../../core/llm/openai'
import { runJuanAgent } from './agent'

const PROMPT = 'You are juan, a helpful spatial-web agent. Say hello in one short sentence.'

export const juan = new Hono()

juan.post('/ping', async (c) => {
  const { text, ok } = await askOpenAI(PROMPT)
  const body: PingResponse = { member: 'juan', message: text, ok }
  return c.json(body)
})

// The interactive version: pass a free-text ask, juan does his job (right
// now: check Berlin's weather) and replies with a brief summary.
juan.post('/report', async (c) => {
  const { message }: PingRequest = await c.req.json().catch(() => ({}))
  const { message: reply, ok } = await runJuanAgent(message ?? 'give me your report')
  const body: PingResponse = { member: 'juan', message: reply, ok }
  return c.json(body)
})
