// juan — OpenAI agent. Owner: juan (gentle default; edit freely).

import type { PingResponse } from '../../contract'
import { Hono } from 'hono'
import { askOpenAI } from '../../core/llm/openai'

const PROMPT = 'You are juan, a helpful spatial-web agent. Say hello in one short sentence.'

export const juan = new Hono()

juan.post('/ping', async (c) => {
  const { text, ok } = await askOpenAI(PROMPT)
  const body: PingResponse = { member: 'juan', message: text, ok }
  return c.json(body)
})
