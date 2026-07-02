// Formatting + label maps shared by every page. Money is integer CENTS
// everywhere in the app; it becomes euros only here, at the edge.

export const STATUS_ORDER = ['new', 'in_review', 'awaiting_docs', 'approved', 'paid'] as const
export type Status = typeof STATUS_ORDER[number]

export const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  in_review: 'In Review',
  awaiting_docs: 'Awaiting Docs',
  approved: 'Approved',
  paid: 'Paid',
}

export const SUB_STATUS_LABELS: Record<string, string> = {
  denied: 'Denied',
  reopened: 'Reopened',
}

export const LINE_LABELS: Record<string, string> = {
  auto: 'Auto',
  property: 'Property',
  liability: 'Liability',
  health: 'Health',
  travel: 'Travel',
}

export const PARTY_ROLE_LABELS: Record<string, string> = {
  insured: 'Insured',
  claimant: 'Claimant',
  adjuster: 'Adjuster',
  third_party: 'Third party',
  witness: 'Witness',
  repair_shop: 'Repair shop',
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  fnol: 'FNOL',
  photo: 'Photo',
  police_report: 'Police report',
  estimate: 'Estimate',
  invoice: 'Invoice',
  proof_of_ownership: 'Proof of ownership',
  medical_bill: 'Medical bill',
  adjuster_report: 'Adjuster report',
  correspondence: 'Correspondence',
  release: 'Release',
  id_declaration: 'ID / declaration',
  witness_statement: 'Witness statement',
  other: 'Other',
}

const euro = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export function formatCents(cents: number | null | undefined): string {
  return euro.format((cents ?? 0) / 100)
}

/** €2.1k for card-sized surfaces, full € below €1,000. */
export function formatCentsShort(cents: number | null | undefined): string {
  const c = cents ?? 0
  if (Math.abs(c) >= 100_000)
    return `€${(c / 100_000).toFixed(1).replace(/\.0$/, '')}k`
  return formatCents(c)
}

export function toDate(v: string | number | Date): Date {
  return v instanceof Date ? v : new Date(v)
}

export function formatDate(v: string | number | Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(toDate(v))
}

export function formatDateTime(v: string | number | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(toDate(v))
}

export function daysSince(v: string | number | Date): number {
  return Math.max(0, Math.floor((Date.now() - toDate(v).getTime()) / 86_400_000))
}

export function timeAgo(v: string | number | Date): string {
  const mins = Math.floor((Date.now() - toDate(v).getTime()) / 60_000)
  if (mins < 1)
    return 'now'
  if (mins < 60)
    return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24)
    return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function initials(name: string | null | undefined): string {
  return (name ?? '?')
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/** Anything the activity feed / claim history renders. */
export interface ActivityItem {
  id: string
  type: 'created' | 'note' | 'status_change' | 'payment' | 'document' | 'party' | 'assignment'
  body?: string | null
  meta?: Record<string, unknown> | null
  createdAt: string | number | Date
  actorId?: string | null
  actorName?: string | null
  claimId?: string
  claimNo?: string
  customer?: string
}

/** One sentence per event — shared by the dashboard feed and the Activity tab. */
export function eventText(ev: ActivityItem): string {
  switch (ev.type) {
    case 'created':
      return ev.body ?? 'opened the claim'
    case 'note':
      return ev.body ?? ''
    case 'status_change': {
      const to = STATUS_LABELS[String(ev.meta?.to ?? '')] ?? String(ev.meta?.to ?? '')
      return `moved to ${to}`
    }
    case 'payment':
      return `paid ${formatCents(Number(ev.meta?.cents ?? 0))}`
    case 'document':
      return ev.body ?? 'added a document'
    case 'party':
      return ev.body ?? 'added a party'
    case 'assignment':
      return ev.body ?? 'reassigned'
    default:
      return ev.body ?? ''
  }
}

export const EVENT_ICONS: Record<ActivityItem['type'], string> = {
  created: 'i-lucide-file-plus-2',
  note: 'i-lucide-message-square',
  status_change: 'i-lucide-arrow-right',
  payment: 'i-lucide-banknote',
  document: 'i-lucide-paperclip',
  party: 'i-lucide-user-plus',
  assignment: 'i-lucide-user-check',
}
