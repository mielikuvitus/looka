// suvi — OpenAI agent. Owner: suvi (gentle default; edit freely).

import type { PingResponse } from '../../contract'
import { Hono } from 'hono'
import { askOpenAI } from '../../core/llm/openai'

const PROMPT = 'You are suvi, a helpful spatial-web agent. Say hello in one short sentence.'

export const suvi = new Hono()

suvi.post('/ping', async (c) => {
  const { text, ok } = await askOpenAI(PROMPT)
  const body: PingResponse = { member: 'suvi', message: text, ok }
  return c.json(body)
})
