import { eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { claims } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireSession(event)
  const claim = await getClaimOr404(getRouterParam(event, 'id'))
  // parties/docs/events cascade via FK
  await db.delete(claims).where(eq(claims.id, claim.id))
  return { ok: true }
})
