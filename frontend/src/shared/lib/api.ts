import type { PingResponse } from '../api-types'

// Same-origin API client. In dev, Vite proxies `/api` to the backend; in prod
// the backend serves this build and `/api` from one origin. No CORS, no auth.

export async function pingAgent(member: string): Promise<PingResponse> {
  const res = await fetch(`/api/${member}/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'looka-room' }),
  })

  if (!res.ok)
    throw new Error(`Ping failed (${res.status})`)

  return await res.json() as PingResponse
}

// Interactive variant: send a free-text message to a member's /report route
// and get back a brief reply. Used by juan's chat-style card.
export async function reportAgent(member: string, message: string): Promise<PingResponse> {
  const res = await fetch(`/api/${member}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'looka-room', message }),
  })

  if (!res.ok)
    throw new Error(`Report failed (${res.status})`)

  return await res.json() as PingResponse
}
