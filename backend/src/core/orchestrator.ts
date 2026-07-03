// The bee — the single orchestrator the room talks to.
//
// The user speaks to one assistant (the bee). It decides whether the message
// belongs to one of its connectors (claimsboard, solidtime, …) and forwards it
// to that agent over the OpenClaw gateway; otherwise it falls back to general
// chat. This is the ChatGPT/Claude connector loop: one assistant, many
// connectors, each an application plus the agent that drives it.

import process from 'node:process'
import { askAgent } from './llm/openclaw'

export interface Connector {
  id: string
  app: string
  /** One-line hint the router reads to decide which connector fits. */
  desc: string
  /** True for shared service agents that act per-user and need a [from:] tag. */
  needsFromTag?: boolean
}

// The bee acts on behalf of one demo user. Their personal data (mail, files,
// calendar, contacts) lives in their personal agent; shared per-user services
// (Solidtime) identify them via a `[from:]` tag — see kami/openclaw/agents.
const DEMO_USER_NAME = process.env.DEMO_USER_NAME ?? 'Looka'
const DEMO_USER_MXID = process.env.DEMO_USER_MXID ?? '@looka:leistenmacher.de'

// Add a row here the moment a new connector is deployed; the bee learns it
// instantly. `claimsboard` + `gridfin` are shared demo/test accounts. Personal
// data goes to the demo user's personal agent (`ewald-schmalz`). Solidtime is
// a shared org service that acts per-user via a `[from:]` tag.
export const CONNECTORS: Connector[] = [
  {
    id: 'claimsboard',
    app: 'Claimsboard',
    desc: 'insurance claims, claim status, assigning/reassigning work, team workload, who is overloaded or idle, approving/paying claims, the board/dashboard (XRCC insurance demo)',
  },
  {
    id: 'gridfin',
    app: 'Gridfin',
    desc: 'the workshop: where tools live, drawers/Schublade contents, Gridfinity bins and inserts, making a bin/baseplate/drill tray, cutouts, 3D-print exports, tool search (Messschieber, Fräser, Bohrer…) (XRCC industry demo)',
  },
  {
    id: 'looka',
    app: 'Nextcloud (personal)',
    desc: `personal data: email, mail, inbox, files, calendars, contacts, passwords — everything in Nextcloud for ${DEMO_USER_NAME}`,
  },
  {
    id: 'solidtime',
    app: 'Solidtime',
    desc: 'time tracking, hours tracked, timers, projects, tasks (Solidtime)',
    needsFromTag: true,
  },
]

// When no connector matches, the bee speaks for itself via a direct OpenAI
// chat call — NEVER the gateway's `main` agent. `main` is the admin agent
// with full tool access; routing user chat there is both forbidden and
// (currently) broken. The bee has no tools and no data of its own; it just
// talks. App-specific facts always come from a connector.
const BEE_SYSTEM_PROMPT = [
  'You are the Bee — the one assistant in the Looka room. Looka is an',
  'agent-workflow visualiser built for the XRCC\'26 hackathon: long-running',
  'backend agents get a face, and you are that face. The user talks to you',
  'out loud and your reply is read aloud by a text-to-speech voice, so write',
  'for speech, not for a screen.',
  '',
  'You are connected to several real applications and act on the user\'s',
  'behalf across them. You are not a generic chatbot — you are an',
  'integration layer with live access to these apps:',
  '• Nextcloud — email, calendar, contacts, and files (read, create, and',
  'update files in the Nextcloud folder).',
  '• Solidtime — time tracking: hours, timers, projects, tasks.',
  '• Claimsboard — insurance claims (the XRCC insurance demo): statuses,',
  'team workload, assigning and approving claims.',
  '• Gridfin — the workshop (the XRCC industry demo): where tools live,',
  'drawers and Gridfinity bins, 3D-print exports.',
  'When a message is about one of these apps, a router hands it to that',
  'app\'s agent and you pass the answer on. You speak directly only when no',
  'app fits.',
  '',
  'When asked who you are or what you can do ("who are you", "what can you',
  'do", "who is the bee"), answer in plain spoken English by NAMING the',
  'applications and one short capability each — never say "organize files"',
  'or "manage things" in the abstract; name Nextcloud, Solidtime,',
  'Claimsboard, Gridfin and say you can act on the user\'s behalf in them.',
  '',
  'When you speak directly: warm, short, plain spoken English — usually one',
  'or two sentences. Greetings, small talk, explanations and general',
  'questions are all yours. Never use markdown, lists, tables, or emoji.',
  'Always reply in English regardless of the user\'s language. Never invent',
  'app data (claim counts, file names, schedules) — if the user clearly wants',
  'a fact or action from an app, say you\'ll check and rely on the routing.',
  'Tone: light, direct, a little playful; never corporate, never cutesy.',
].join('\n')

export interface OrchestratorResult {
  /** Which connector id handled this, or null for general chat. */
  connector: string | null
  reply: string
  ok: boolean
}

/**
 * One turn of the connector loop. Never throws.
 *
 * decide → reach the connector over the gateway, OR (null) let the bee chat
 * for itself via a direct OpenAI call. The gateway's `main` admin agent is
 * never used.
 */
export async function orchestrate(transcript: string): Promise<OrchestratorResult> {
  const connector = await decide(transcript)
  if (connector) {
    const conn = CONNECTORS.find(c => c.id === connector)
    // Shared per-user services (Solidtime) need a [from:] tag so they use the
    // demo user's credentials; personal/demo agents are addressed directly.
    const content = conn?.needsFromTag
      ? `[from: ${DEMO_USER_NAME} (${DEMO_USER_MXID})]\n${transcript}`
      : transcript
    const r = await askAgent(connector, [{ role: 'user', content }])
    return { connector, reply: r.text, ok: r.ok }
  }
  const r = await chatAsBee(transcript)
  return { connector: null, reply: r.text, ok: r.ok }
}

/** The bee speaking for itself — a direct chat completion, no gateway/tools. */
async function chatAsBee(transcript: string): Promise<{ text: string, ok: boolean }> {
  const key = process.env.OPENAI_API_KEY
  if (!key)
    return { ok: false, text: '' }
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        max_completion_tokens: 220,
        messages: [
          { role: 'system', content: BEE_SYSTEM_PROMPT },
          { role: 'user', content: transcript },
        ],
      }),
    })
    if (!res.ok)
      return { ok: false, text: '' }
    const data = await res.json() as { choices?: { message?: { content?: string } }[] }
    const text = data.choices?.[0]?.message?.content?.trim()
    return { ok: true, text: text || '' }
  }
  catch {
    return { ok: false, text: '' }
  }
}

const BEE_PERSONA
  = 'You are the Bee, the one assistant in the Looka room. You just fetched facts '
    + 'from a connector and now speak them to the user. Warm, short, spoken language — '
    + 'two or three sentences, no markdown, no lists, no emoji. Always reply in '
    + 'English; if the connector answer is in another language (often German), '
    + 'translate it naturally without changing any facts, names, or numbers. Keep every fact, name, '
    + 'and number exactly as given; never add new ones. End with a short offer of the '
    + 'natural next step when one exists.'

/**
 * Re-voice a connector's factual reply in the bee's spoken voice. Used by the
 * voice endpoint before TTS. Degrades to the raw reply on any problem — a
 * compose hiccup must never eat the facts.
 */
export async function composeSpoken(transcript: string, r: OrchestratorResult): Promise<string> {
  const key = process.env.OPENAI_API_KEY
  if (!key || !r.ok || !r.connector)
    return r.reply
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-5.4-mini',
        max_completion_tokens: 220,
        messages: [
          { role: 'system', content: BEE_PERSONA },
          {
            role: 'user',
            content: `The user asked: "${transcript}"\n\nThe ${r.connector} connector answered:\n${r.reply}\n\nSpeak the answer.`,
          },
        ],
      }),
    })
    if (!res.ok)
      return r.reply
    const data = await res.json() as { choices?: { message?: { content?: string } }[] }
    return data.choices?.[0]?.message?.content?.trim() || r.reply
  }
  catch {
    return r.reply
  }
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
