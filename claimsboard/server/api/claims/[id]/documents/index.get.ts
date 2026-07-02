import { desc, eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { claimDocs } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireSession(event)
  const claim = await getClaimOr404(getRouterParam(event, 'id'))
  return db.select().from(claimDocs).where(eq(claimDocs.claimId, claim.id)).orderBy(desc(claimDocs.uploadedAt))
})
