import { desc, eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { claims, user } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireSession(event)
  const rows = await db
    .select({ claim: claims, assigneeName: user.name })
    .from(claims)
    .leftJoin(user, eq(claims.assigneeId, user.id))
    .orderBy(desc(claims.reportedAt))
  // Filtering (status/line/q) happens client-side — the dataset is tiny.
  return rows.map(r => ({ ...r.claim, assigneeName: r.assigneeName }))
})
