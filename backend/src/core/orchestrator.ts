// The bee — the single orchestrator the room talks to.
//
// The user speaks to one assistant (the bee). It decides whether the message
// belongs to one of its connectors (claimsboard, solidtime, …) and forwards it
// to that agent over the OpenClaw gateway; otherwise it falls back to general
// chat. This is the ChatGPT/Claude connector loop: one assistant, many
// connectors, each an application plus the agent that drives it.

import process from 'node:process'
import { askAgent, type ChatMsg } from './llm/openclaw'

export interface Connector {
  id: string
  app: string
  /** One-line hint the router reads to decide which connector fits. */
  desc: string
}

// Add a row here the moment a new connector is deployed; the bee learns it
// instantly. `claimsboard` is live on the gateway today.
export const CONNECTORS: Connector[] = [
  {
    id: 'claimsboard',
    app: 'Claimsboard',
    desc: 'insurance claims, claim status, assigning/reassigning work, team workload, who is overloaded or idle, approving/paying claims, the board/dashboard (XRCC insurance demo)',
  },
  { id: 'solidtime', app: 'Solidtime', desc: 'time tracking, hours, timers, projects' },
  { id: 'nextcloud', app: 'Nextcloud', desc: 'files, calendars, contacts, passwords' },
  { id: 'gridfin', app: 'Gridfin', desc: 'the workshop: where tools live, drawers/Schublade contents, Gridfinity bins and inserts, making a bin/baseplate/drill tray, cutouts, 3D-print exports, tool search (Messschieber, Fräser, Bohrer…) (XRCC industry demo)' },
]

/** General-chat agent when no connector matches. */
const FALLBACK_AGENT = 'main'

export interface OrchestratorResult {
  /** Which connector id handled this, or null for general chat. */
  connector: string | null
  reply: string
  ok: boolean
}

/**
 * One turn of the connector loop. Never throws.
 *
 * decide → reach the connector (or fallback) → return its reply.
 */
export async function orchestrate(transcript: string): Promise<OrchestratorResult> {
  const connector = await decide(transcript)
  const agentId = connector ?? FALLBACK_AGENT
  const messages: ChatMsg[] = [{ role: 'user', content: transcript }]
  const r = await askAgent(agentId, messages)
  return { connector, reply: r.text, ok: r.ok }
}

/**
 * Classify the transcript into a connector id, or null for general chat.
 * Uses a tiny model call when OPENAI_API_KEY is set; otherwise falls back to a
 * keyword shortcut so the demo still routes without router credentials.
 */
async function decide(transcript: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key)
    return keywordRoute(transcript)

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENCLAW_ROUTER_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: 0,
        max_completion_tokens: 60,
        messages: [
          {
            role: 'system',
            content:
              `You route a user message to one agent id, or null for general chat. `
              + `Reply with JSON {"agent": "<id>" | null} and nothing else.\nOptions:\n${
                CONNECTORS.map(c => `- ${c.id}: ${c.desc}`).join('\n')}`,
          },
          { role: 'user', content: transcript },
        ],
      }),
    })

    if (!res.ok)
      return keywordRoute(transcript)

    const data = await res.json() as {
      choices?: { message?: { content?: string } }[]
    }
    const content = data.choices?.[0]?.message?.content ?? ''
    const match = content.match(/"agent"\s*:\s*"?(?<id>[\w-]+)"?/i)
    const id = match?.groups?.id ?? null
    if (!id || id === 'null')
      return null
    return CONNECTORS.some(c => c.id === id) ? id : null
  }
  catch {
    return keywordRoute(transcript)
  }
}

/** Offline fallback: claims words → claimsboard, workshop words → gridfin, else general. */
function keywordRoute(transcript: string): string | null {
  if (/\b(?:claim|claimsboard|overload|workload|assign|reassign|approve|paid|pay|sla)\b/i.test(transcript))
    return 'claimsboard'
  // Deliberately no \bbin\b (German "ich bin …") and no \btool\b (too generic).
  if (/\b(?:drawer|schublade|einsatz|gridfin(?:ity)?|workshop|werkstatt|baseplate|grundplatte|cutout|fräser|bohrer|gewindebohrer|messschieber|schieblehre|caliper|bohrerablage)\b/i.test(transcript))
    return 'gridfin'
  return null
}
