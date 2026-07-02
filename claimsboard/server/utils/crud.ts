// Shared lookup helpers with the app's one error shape:
// createError({ statusCode, statusMessage }) — surfaced by useFetch/$fetch.

import type { Claim } from '../db/schema'
import { eq } from 'drizzle-orm'
import { createError } from 'h3'
import { db } from '../db/client'
import { claims } from '../db/schema'

export async function getClaimOr404(id: string | undefined): Promise<Claim> {
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'Missing claim id' })
  const [row] = await db.select().from(claims).where(eq(claims.id, id))
  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'Claim not found' })
  return row
}
