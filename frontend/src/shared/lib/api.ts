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
