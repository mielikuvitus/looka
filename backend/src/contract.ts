// Canonical API contract (source of truth).
//
// The backend owns these types. `pnpm gen:types` reads this file's shapes and
// writes the frontend's committed copy at `frontend/src/shared/api-types.ts`.
// Keep it small and honest so it never blocks the build.

/** The four Looka members. Person-only names; ownership is a gentle default. */
export const MEMBERS = ['frank', 'juan', 'suvi', 'joe'] as const

export type Member = (typeof MEMBERS)[number]

/** Body sent to `POST /api/<member>/ping`. */
export interface PingRequest {
  /** Optional caller tag, e.g. "looka-room". */
  from?: string
}

/** Reply from `POST /api/<member>/ping`. */
export interface PingResponse {
  /** Member/agent that answered, e.g. "frank". */
  member: string
  /** Human-readable reply text to show in the card. */
  message: string
  /** Whether the agent handled the ping successfully. */
  ok: boolean
}

// A tiny OpenAPI-ish description of the routes. Not a full spec — just enough
// to document the shape and to drive `gen:types`. Kept deliberately minimal.
export const apiContract = {
  openapi: '3.0.0',
  info: { title: 'Looka API', version: '0.0.0' },
  members: MEMBERS,
  paths: {
    '/api/health': { get: { summary: 'Liveness probe', response: 'HealthResponse' } },
    '/api/{member}/ping': {
      post: {
        summary: 'Ping an agent and get a short reply',
        request: 'PingRequest',
        response: 'PingResponse',
      },
    },
  },
} as const

export interface HealthResponse {
  ok: boolean
  service: string
}
