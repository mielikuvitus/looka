import { db } from '~~/server/db/client'
import { claimParties } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const me = await requireSession(event)
  const claim = await getClaimOr404(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, PartyCreate.parse)

  const [row] = await db.insert(claimParties).values({
    claimId: claim.id,
    ...body,
  }).returning()
  if (!row)
    throw createError({ statusCode: 500, statusMessage: 'Party insert failed' })
  await appendEvent(claim.id, 'party', me.id, `${row.name} added as ${row.role.replace('_', ' ')}`, { partyId: row.id })
  return row
})
