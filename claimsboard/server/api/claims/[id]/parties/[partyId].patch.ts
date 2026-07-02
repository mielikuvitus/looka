import { and, eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { claimParties } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireSession(event)
  const claim = await getClaimOr404(getRouterParam(event, 'id'))
  const partyId = getRouterParam(event, 'partyId')
  const body = await readValidatedBody(event, PartyPatch.parse)

  const [row] = await db.update(claimParties)
    .set(body)
    .where(and(eq(claimParties.id, partyId ?? ''), eq(claimParties.claimId, claim.id)))
    .returning()
  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'Party not found' })
  return row
})
