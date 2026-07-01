// juan — the agent itself. Owner: juan (gentle default; edit freely).
//
// This is the ONE seam between "what juan does" and "how the API/frontend
// call him." Today the internals are: fetch Berlin weather, then ask OpenAI
// for a brief summary. If a real, already-built external agent ever replaces
// this, only this function's body should need to change — the route handler
// and the frontend never see the difference.

import { askOpenAI } from '../../core/llm/openai'
import { getBerlinWeather } from './weather'

export interface JuanAgentResult {
  message: string
  ok: boolean
}

export async function runJuanAgent(userMessage: string): Promise<JuanAgentResult> {
  const weather = await getBerlinWeather()
  if (!weather.ok) {
    return {
      ok: false,
      message: '[juan] Could not reach the weather service — try again.',
    }
  }

  const prompt = [
    'You are juan, a helpful spatial-web agent.',
    `The user asked: "${userMessage}".`,
    `Today's Berlin weather: ${weather.temperatureC}°C, wind ${weather.windSpeedKmh} km/h, ${weather.isDay ? 'daytime' : 'nighttime'}.`,
    'Give a very brief (one short sentence) summary of your findings.',
  ].join(' ')

  const { text, ok } = await askOpenAI(prompt)
  return { message: text, ok }
}
