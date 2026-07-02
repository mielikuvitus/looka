import { asc, eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { claimParties } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireSession(event)
  const claim = await getClaimOr404(getRouterParam(event, 'id'))
  return db.select().from(claimParties).where(eq(claimParties.claimId, claim.id)).orderBy(asc(claimParties.createdAt))
})
