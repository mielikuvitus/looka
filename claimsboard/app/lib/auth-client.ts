// Better Auth browser client — same-origin, so no baseURL needed. Server-side
// session reads go through useRequestFetch('/api/auth/get-session') in
// useAuth(), never through this client.
import { createAuthClient } from 'better-auth/vue'

export const authClient = createAuthClient()
