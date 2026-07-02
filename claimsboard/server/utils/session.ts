// Session guards. Middleware on the client is UX; these are the actual checks.

import type { H3Event } from 'h3'
import { createError } from 'h3'
import { auth } from '../lib/auth'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: 'handler' | 'manager'
  image?: string | null
}

export async function requireSession(event: H3Event): Promise<SessionUser> {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session)
    throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  return session.user as unknown as SessionUser
}

export async function requireManager(event: H3Event): Promise<SessionUser> {
  const me = await requireSession(event)
  if (me.role !== 'manager')
    throw createError({ statusCode: 403, statusMessage: 'Managers only' })
  return me
}
