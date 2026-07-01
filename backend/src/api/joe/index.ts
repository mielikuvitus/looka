// joe — OpenAI agent. Owner: joe (gentle default; edit freely).

import type { PingResponse } from '../../contract'
import { Hono } from 'hono'
import { askOpenAI } from '../../core/llm/openai'

const PROMPT = 'You are joe, a helpful spatial-web agent. Say hello in one short sentence.'

export const joe = new Hono()

joe.post('/ping', async (c) => {
  const { text, ok } = await askOpenAI(PROMPT)
  const body: PingResponse = { member: 'joe', message: text, ok }
  return c.json(body)
})
