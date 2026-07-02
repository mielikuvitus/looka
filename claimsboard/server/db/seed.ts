/* eslint-disable no-console */
// Dev seed: wipes everything, creates the team THROUGH Better Auth (raw
// inserts would skip password hashing → silent login failures), then lays out
// ~18 claims so the board, dashboard and team pages look alive on first load:
// Sami deliberately overloaded, 3 claims past SLA, payments inside this week.
//
// Run: pnpm db:seed   (idempotent — wipes and re-seeds)

import process from 'node:process'
import { eq } from 'drizzle-orm'
import { auth } from '../lib/auth'
import { db } from './client'
import { runMigrations } from './migrate'
import { account, claimDocs, claimEvents, claimParties, claims, session, user, verification } from './schema'

const DEV_PASSWORD = process.env.DEV_PASSWORD ?? 'claimsboard-dev'

const now = Date.now()
/** days (+hours) ago → Date */
function d(days: number, hours = 0): Date {
  return new Date(now - days * 86_400_000 - hours * 3_600_000)
}
/** days ago → ISO date-only string */
function iso(days: number): string {
  return d(days).toISOString().slice(0, 10)
}
/** euros → integer cents */
function eur(euros: number): number {
  return Math.round(euros * 100)
}

async function main() {
  runMigrations()

  // ---- wipe (dev-only), FK-safe order ----
  await db.delete(claimEvents)
  await db.delete(claimDocs)
  await db.delete(claimParties)
  await db.delete(claims)
  await db.delete(session)
  await db.delete(account)
  await db.delete(verification)
  await db.delete(user)

  // ---- users via Better Auth ----
  const USERS = [
    { name: 'Mara', email: 'mara@claimsboard.test', role: 'manager' as const },
    { name: 'Jana', email: 'jana@claimsboard.test', role: 'handler' as const },
    { name: 'Sami', email: 'sami@claimsboard.test', role: 'handler' as const },
  ]
  const uid: Record<string, string> = {}
  for (const u of USERS) {
    await auth.api.signUpEmail({ body: { name: u.name, email: u.email, password: DEV_PASSWORD } })
    const [row] = await db.select().from(user).where(eq(user.email, u.email))
    if (!row)
      throw new Error(`sign-up did not create ${u.email}`)
    if (row.role !== 'handler')
      console.warn(`note: sign-up default role was '${row.role}', expected 'handler'`)
    // adapter defaultValue is unreliable (better-auth #2674) → set explicitly
    await db.update(user).set({ role: u.role }).where(eq(user.id, row.id))
    uid[u.name.toLowerCase()] = row.id
  }
  const mara = uid.mara!
  const jana = uid.jana!
  const sami = uid.sami!

  // ---- claims ----
  interface Spec {
    claimNo: string
    policyNo: string
    line: typeof claims.$inferInsert['line']
    lossType: string
    customer: string
    status: typeof claims.$inferInsert['status']
    subStatus?: 'denied' | 'reopened'
    assignee: string | null
    reportedDaysAgo: number
    location: string
    description: string
    reserve: number
    paid?: number
    settlement?: number
    deductible?: number
    /** when the LAST change happened (drives updatedAt + paid-this-week) */
    updatedDaysAgo?: number
  }

  const SPECS: Spec[] = [
    { claimNo: '4442', policyNo: 'HR-2214-0071', line: 'property', lossType: 'water', customer: 'K. Hoffmann', status: 'paid', assignee: jana, reportedDaysAgo: 29, location: 'Düsseldorf', description: 'Burst pipe under the kitchen sink; water damage to floor and cabinets.', reserve: 8400, paid: 7900, settlement: 7900, deductible: 300, updatedDaysAgo: 2 },
    { claimNo: '4443', policyNo: 'KFZ-8830-1145', line: 'auto', lossType: 'collision', customer: 'M. Weber', status: 'paid', assignee: sami, reportedDaysAgo: 27, location: 'Köln', description: 'Rear-ended at traffic lights on Aachener Str.; bumper and tailgate.', reserve: 3200, paid: 2950, settlement: 2950, deductible: 500, updatedDaysAgo: 10 },
    { claimNo: '4444', policyNo: 'RS-5521-0908', line: 'travel', lossType: 'theft', customer: 'L. Schneider', status: 'paid', assignee: jana, reportedDaysAgo: 25, location: 'Lisbon (abroad)', description: 'Bag stolen at Rossio station; phone and documents inside.', reserve: 900, paid: 620, settlement: 620, updatedDaysAgo: 5 },
    { claimNo: '4445', policyNo: 'KV-7702-3319', line: 'health', lossType: 'medical', customer: 'T. Brandt', status: 'paid', assignee: sami, reportedDaysAgo: 24, location: 'Essen', description: 'Outpatient physiotherapy after a bicycle fall; 12 sessions.', reserve: 2400, paid: 2400, settlement: 2400, updatedDaysAgo: 1 },
    { claimNo: '4446', policyNo: 'HR-2214-0533', line: 'property', lossType: 'fire', customer: 'R. Aydın', status: 'approved', assignee: sami, reportedDaysAgo: 18, location: 'Dortmund', description: 'Kitchen fire from a faulty fryer; smoke damage in two rooms.', reserve: 14000, settlement: 12500, deductible: 500, updatedDaysAgo: 2 },
    { claimNo: '4447', policyNo: 'HP-3308-2177', line: 'liability', lossType: 'property damage', customer: 'Café Florian GmbH', status: 'approved', assignee: jana, reportedDaysAgo: 15, location: 'Bonn', description: 'Guest\'s laptop damaged by a spilled tray; business liability.', reserve: 6800, settlement: 6100, updatedDaysAgo: 3 },
    { claimNo: '4459', policyNo: 'KFZ-8830-2260', line: 'auto', lossType: 'collision', customer: 'P. Novak', status: 'approved', assignee: sami, reportedDaysAgo: 9, location: 'Duisburg', description: 'Parked car hit in a supermarket lot; rear-left panel and light.', reserve: 2300, settlement: 2100, deductible: 300, updatedDaysAgo: 1 },
    { claimNo: '4448', policyNo: 'HR-2214-1902', line: 'property', lossType: 'water', customer: 'S. Yilmaz', status: 'awaiting_docs', assignee: jana, reportedDaysAgo: 12, location: 'Wuppertal', description: 'Washing machine leak into the flat below; photos still missing.', reserve: 5200, updatedDaysAgo: 0 },
    { claimNo: '4449', policyNo: 'KFZ-8830-0412', line: 'auto', lossType: 'theft', customer: 'D. Krüger', status: 'awaiting_docs', assignee: sami, reportedDaysAgo: 6, location: 'Leverkusen', description: 'Vehicle stolen overnight; waiting on the police case number.', reserve: 9800, updatedDaysAgo: 1 },
    { claimNo: '4450', policyNo: 'KV-7702-8804', line: 'health', lossType: 'medical', customer: 'A. Petersen', status: 'awaiting_docs', assignee: sami, reportedDaysAgo: 4, location: 'Münster', description: 'Dental treatment invoice illegible; new copy requested.', reserve: 1600, updatedDaysAgo: 1 },
    { claimNo: '4451', policyNo: 'HR-2214-3350', line: 'property', lossType: 'storm', customer: 'H. Lindemann', status: 'in_review', assignee: jana, reportedDaysAgo: 10, location: 'Aachen', description: 'Roof tiles lifted in the June storm; ceiling stain in the bedroom.', reserve: 7300, updatedDaysAgo: 2 },
    { claimNo: '4452', policyNo: 'KFZ-8830-5578', line: 'auto', lossType: 'collision', customer: 'F. Öztürk', status: 'in_review', assignee: sami, reportedDaysAgo: 5, location: 'Köln', description: 'Lane-change contact on the A1; both drivers dispute fault.', reserve: 4100, updatedDaysAgo: 1 },
    { claimNo: '4453', policyNo: 'RS-5521-4470', line: 'travel', lossType: 'cancellation', customer: 'I. Marino', status: 'in_review', subStatus: 'denied', assignee: sami, reportedDaysAgo: 6, location: 'Essen', description: 'Trip cancelled for a pre-existing condition — outside cover.', reserve: 1200, updatedDaysAgo: 1 },
    { claimNo: '4454', policyNo: 'HP-3308-0961', line: 'liability', lossType: 'injury', customer: 'B. Fischer', status: 'in_review', subStatus: 'reopened', assignee: jana, reportedDaysAgo: 21, location: 'Düsseldorf', description: 'Slip on unsalted steps; reopened after appeal with a new medical bill.', reserve: 11000, updatedDaysAgo: 2 },
    { claimNo: '4455', policyNo: 'HR-2214-7215', line: 'property', lossType: 'theft', customer: 'N. Wagner', status: 'in_review', assignee: sami, reportedDaysAgo: 3, location: 'Bochum', description: 'Basement break-in; e-bike and tools taken.', reserve: 2800, updatedDaysAgo: 0 },
    { claimNo: '4456', policyNo: 'KFZ-8830-9033', line: 'auto', lossType: 'glass', customer: 'E. Kowalski', status: 'new', assignee: null, reportedDaysAgo: 2, location: 'Dortmund', description: 'Stone chip spread into a crack across the windscreen.', reserve: 500 },
    { claimNo: '4457', policyNo: 'HR-2214-8846', line: 'property', lossType: 'water', customer: 'G. Bakker', status: 'new', assignee: null, reportedDaysAgo: 1, location: 'Krefeld', description: 'Damp patch spreading on the bathroom wall; cause unclear.', reserve: 0 },
    { claimNo: '4458', policyNo: 'KV-7702-1152', line: 'health', lossType: 'dental', customer: 'J. Sørensen', status: 'new', assignee: sami, reportedDaysAgo: 0, location: 'Düsseldorf', description: 'Crown replacement quote submitted for pre-approval.', reserve: 0 },
  ]

  const cid: Record<string, string> = {}
  await db.insert(claims).values(SPECS.map((s) => {
    const id = crypto.randomUUID()
    cid[s.claimNo] = id
    return {
      id,
      claimNo: s.claimNo,
      policyNo: s.policyNo,
      line: s.line,
      status: s.status,
      subStatus: s.subStatus ?? null,
      customer: s.customer,
      lossType: s.lossType,
      lossDate: iso(s.reportedDaysAgo + 1),
      reportedAt: d(s.reportedDaysAgo, 3),
      location: s.location,
      description: s.description,
      reserveCents: eur(s.reserve),
      paidCents: eur(s.paid ?? 0),
      deductibleCents: eur(s.deductible ?? 0),
      settlementCents: eur(s.settlement ?? 0),
      assigneeId: s.assignee,
      createdAt: d(s.reportedDaysAgo, 3),
      updatedAt: d(s.updatedDaysAgo ?? s.reportedDaysAgo),
    }
  }))

  // ---- parties (insured always; extras where they tell a story) ----
  const party = (claimNo: string, role: typeof claimParties.$inferInsert['role'], name: string, contact?: string, org?: string) => ({
    claimId: cid[claimNo]!,
    role,
    name,
    contact: contact ?? null,
    org: org ?? null,
    createdAt: d(SPECS.find(s => s.claimNo === claimNo)!.reportedDaysAgo, 2),
  })

  await db.insert(claimParties).values([
    // Blanket: the customer is the insured, except on liability claims where they
    // are usually the claimant bringing the claim. 4447 is spelled out below
    // (the café holds the policy, so it's the insured, not the claimant).
    ...SPECS.filter(s => s.claimNo !== '4447').map(s => party(s.claimNo, s.line === 'liability' ? 'claimant' : 'insured', s.customer, `${s.customer.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`)),
    party('4447', 'insured', 'Café Florian GmbH', 'info@cafe-florian.de', 'Café Florian GmbH'),
    party('4447', 'claimant', 'D. Vogel', 'd.vogel@example.com'),
    party('4454', 'insured', 'Hausverwaltung Brenner GmbH', 'kontakt@hv-brenner.de', 'Hausverwaltung Brenner GmbH'),
    party('4442', 'repair_shop', 'Sanitär Krause', '0211 555 0142', 'Sanitär Krause GmbH'),
    party('4443', 'repair_shop', 'Werkstatt Meier', '0221 555 8890', 'Werkstatt Meier GmbH'),
    party('4446', 'adjuster', 'G. Steinbach', 'g.steinbach@tuev-gutachten.de', 'TÜV Rheinland Gutachten'),
    party('4459', 'adjuster', 'S. Ilg', 's.ilg@dekra.example', 'DEKRA'),
    party('4459', 'repair_shop', 'Karosserie Nowak & Söhne', '0203 555 2216'),
    party('4447', 'witness', 'R. Peters', '0228 555 7741'),
    party('4449', 'witness', 'T. Albers', '0214 555 3308'),
  ])

  // ---- documents (metadata → committed placeholder assets) ----
  const doc = (claimNo: string, type: typeof claimDocs.$inferInsert['type'], filename: string, url: string, mime: string, by: string, daysAgo: number, size: number) => ({
    claimId: cid[claimNo]!,
    type,
    filename,
    url,
    mimeType: mime,
    sizeBytes: size,
    uploadedBy: by,
    uploadedAt: d(daysAgo),
  })

  await db.insert(claimDocs).values([
    doc('4442', 'invoice', 'invoice-sanitaer-krause.pdf', '/samples/invoice.pdf', 'application/pdf', jana, 4, 747),
    doc('4442', 'photo', 'kitchen-floor.jpg', '/samples/photo-1.svg', 'image/svg+xml', jana, 27, 1200),
    doc('4446', 'fnol', 'fnol-4446.pdf', '/samples/fnol.pdf', 'application/pdf', sami, 18, 766),
    doc('4446', 'police_report', 'fire-brigade-report.pdf', '/samples/police-report.pdf', 'application/pdf', sami, 15, 764),
    doc('4446', 'photo', 'bedroom-ceiling.jpg', '/samples/photo-3.svg', 'image/svg+xml', sami, 17, 1200),
    doc('4459', 'estimate', 'karosserie-estimate.pdf', '/samples/estimate.pdf', 'application/pdf', sami, 5, 768),
    doc('4459', 'photo', 'rear-left-impact.jpg', '/samples/photo-2.svg', 'image/svg+xml', sami, 8, 1500),
    doc('4448', 'fnol', 'fnol-4448.pdf', '/samples/fnol.pdf', 'application/pdf', jana, 11, 766),
    doc('4448', 'photo', 'leak-under-machine.jpg', '/samples/photo-1.svg', 'image/svg+xml', jana, 10, 1200),
    doc('4449', 'fnol', 'fnol-4449.pdf', '/samples/fnol.pdf', 'application/pdf', sami, 6, 766),
    doc('4449', 'police_report', 'police-case-anzeige.pdf', '/samples/police-report.pdf', 'application/pdf', sami, 5, 764),
    doc('4451', 'fnol', 'fnol-4451.pdf', '/samples/fnol.pdf', 'application/pdf', jana, 9, 766),
    doc('4451', 'photo', 'roof-and-ceiling.jpg', '/samples/photo-3.svg', 'image/svg+xml', jana, 8, 1200),
  ])

  // ---- events (history that matches each claim's state) ----
  type EvType = typeof claimEvents.$inferInsert['type']
  const evs: Array<typeof claimEvents.$inferInsert> = []
  const ev = (claimNo: string, type: EvType, actor: string | null, daysAgo: number, hoursAgo = 0, body?: string, meta?: Record<string, unknown>) => {
    evs.push({
      claimId: cid[claimNo]!,
      type,
      actorId: actor,
      body: body ?? null,
      meta: meta ?? null,
      createdAt: d(daysAgo, hoursAgo),
    })
  }

  for (const s of SPECS) {
    const a = s.assignee
    ev(s.claimNo, 'created', a ?? mara, s.reportedDaysAgo, 3, `Claim #${s.claimNo} opened for ${s.customer}`)
    if (a)
      ev(s.claimNo, 'assignment', mara, s.reportedDaysAgo, 1, `Assigned to ${a === jana ? 'Jana' : a === sami ? 'Sami' : 'Mara'}`, { to: a })
  }

  // status journeys (from → to, spaced along each claim's life)
  const move = (claimNo: string, actor: string, daysAgo: number, from: string, to: string, hoursAgo = 0) =>
    ev(claimNo, 'status_change', actor, daysAgo, hoursAgo, null, { from, to })
  const pay = (claimNo: string, actor: string, daysAgo: number, cents: number) =>
    ev(claimNo, 'payment', actor, daysAgo, 0, null, { cents })

  // paid claims: new → in_review → approved → paid (+payment)
  move('4442', jana, 26, 'new', 'in_review')
  move('4442', jana, 8, 'in_review', 'approved')
  move('4442', mara, 2, 'approved', 'paid')
  pay('4442', mara, 2, eur(7900))
  move('4443', sami, 24, 'new', 'in_review')
  move('4443', sami, 14, 'in_review', 'approved')
  move('4443', mara, 10, 'approved', 'paid')
  pay('4443', mara, 10, eur(2950))
  move('4444', jana, 22, 'new', 'in_review')
  move('4444', jana, 9, 'in_review', 'approved')
  move('4444', mara, 5, 'approved', 'paid')
  pay('4444', mara, 5, eur(620))
  move('4445', sami, 20, 'new', 'in_review')
  move('4445', sami, 6, 'in_review', 'approved')
  move('4445', mara, 1, 'approved', 'paid')
  pay('4445', mara, 1, eur(2400))

  // approved claims
  move('4446', sami, 16, 'new', 'in_review')
  move('4446', sami, 2, 'in_review', 'approved')
  move('4447', jana, 12, 'new', 'in_review')
  move('4447', jana, 3, 'in_review', 'approved')
  move('4459', sami, 7, 'new', 'in_review')
  move('4459', sami, 1, 'in_review', 'approved') // "Sami approved #4459 · €2.1k"

  // awaiting docs
  move('4448', jana, 11, 'new', 'in_review')
  move('4448', jana, 9, 'in_review', 'awaiting_docs')
  move('4449', sami, 5, 'new', 'in_review')
  move('4449', sami, 4, 'in_review', 'awaiting_docs')
  move('4450', sami, 3, 'new', 'in_review')
  move('4450', sami, 1, 'in_review', 'awaiting_docs')

  // in review
  move('4451', jana, 8, 'new', 'in_review')
  move('4452', sami, 4, 'new', 'in_review')
  move('4453', sami, 5, 'new', 'in_review')
  move('4454', jana, 19, 'new', 'in_review')
  move('4455', sami, 2, 'new', 'in_review')

  // document uploads mirror the claim_docs rows above
  ev('4442', 'document', jana, 4, 0, 'Uploaded invoice-sanitaer-krause.pdf')
  ev('4446', 'document', sami, 15, 0, 'Uploaded fire-brigade-report.pdf')
  ev('4459', 'document', sami, 5, 0, 'Uploaded karosserie-estimate.pdf')
  ev('4448', 'document', jana, 10, 0, 'Uploaded leak-under-machine.jpg')
  ev('4449', 'document', sami, 5, 2, 'Uploaded police-case-anzeige.pdf')
  ev('4451', 'document', jana, 8, 1, 'Uploaded roof-and-ceiling.jpg')

  // notes — the human trail
  ev('4448', 'note', jana, 0, 4, 'Called S. Yilmaz — photos of the flat below promised by Friday.')
  ev('4449', 'note', sami, 1, 2, 'Police case number still pending; chased the Anzeige by phone.')
  ev('4452', 'note', sami, 3, 0, 'Werkstatt estimate looks high — asked for a second opinion.')
  ev('4454', 'note', mara, 2, 5, 'Reopened after appeal; new medical bill attached to the file.')
  ev('4453', 'note', sami, 1, 6, 'Denied — pre-existing condition, outside cover. Letter drafted.')

  await db.insert(claimEvents).values(evs)

  console.log(`Seeded ${USERS.length} users, ${SPECS.length} claims, ${evs.length} events.`)
  console.log(`Sign in: mara|jana|sami@claimsboard.test / ${DEV_PASSWORD}`)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
