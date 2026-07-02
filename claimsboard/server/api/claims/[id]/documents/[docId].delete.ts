import { existsSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { and, eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { claimDocs } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireSession(event)
  const claim = await getClaimOr404(getRouterParam(event, 'id'))
  const docId = getRouterParam(event, 'docId')

  const [doc] = await db.select().from(claimDocs).where(and(eq(claimDocs.id, docId ?? ''), eq(claimDocs.claimId, claim.id)))
  if (!doc)
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })

  await db.delete(claimDocs).where(eq(claimDocs.id, doc.id))

  // remove the file too, but only if it lives under uploads/ (samples stay)
  if (doc.url.startsWith('/uploads/')) {
    const uploadsRoot = resolve(process.cwd(), 'uploads')
    const abs = resolve(process.cwd(), `.${doc.url}`)
    if (abs.startsWith(`${uploadsRoot}/`) && existsSync(abs)) {
      try {
        unlinkSync(abs)
      }
      catch { /* metadata row is gone; a stray file is harmless in dev */ }
    }
  }
  return { ok: true }
})
