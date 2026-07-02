// The claim FILE as GET /api/claims/:id returns it (dates are ISO strings
// over JSON). Kept in one place so the claim-file components agree.
import type { ActivityItem, Status } from '~/utils/format'

export interface ClaimParty {
  id: string
  claimId: string
  role: string
  name: string
  contact: string | null
  org: string | null
  createdAt: string
}

export interface ClaimDocRow {
  id: string
  claimId: string
  type: string
  filename: string
  url: string
  mimeType: string | null
  sizeBytes: number | null
  uploadedBy: string | null
  uploadedAt: string
}

export interface ClaimFile {
  id: string
  claimNo: string
  policyNo: string
  line: 'auto' | 'property' | 'liability' | 'health' | 'travel'
  status: Status
  subStatus: 'denied' | 'reopened' | null
  customer: string
  lossType: string | null
  lossDate: string | null
  reportedAt: string
  location: string | null
  description: string | null
  reserveCents: number
  paidCents: number
  deductibleCents: number
  settlementCents: number
  assigneeId: string | null
  createdAt: string
  updatedAt: string
  parties: ClaimParty[]
  docs: ClaimDocRow[]
  events: ActivityItem[]
  assignee: { id: string, name: string } | null
}
