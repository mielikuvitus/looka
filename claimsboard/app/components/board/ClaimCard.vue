<script lang="ts">
/** One row of GET /api/claims — dates arrive as ISO strings over JSON. */
export interface BoardClaim {
  id: string
  claimNo: string
  policyNo: string
  line: 'auto' | 'property' | 'liability' | 'health' | 'travel'
  status: 'new' | 'in_review' | 'awaiting_docs' | 'approved' | 'paid'
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
  settlementCents: number | null
  assigneeId: string | null
  createdAt: string
  updatedAt: string
  assigneeName: string | null
}
</script>

<script setup lang="ts">
import { daysSince, formatCentsShort, initials, LINE_LABELS } from '~/utils/format'

const props = defineProps<{ claim: BoardClaim }>()

const router = useRouter()

// Sortable installs a capture-phase document click listener that swallows the
// click following a drag (verified in vue-draggable-plus' bundled Sortable),
// so this handler only fires for a genuine click.
function open() {
  router.push(`/claims/${props.claim.id}`)
}
</script>

<template>
  <article
    class="cursor-pointer select-none border border-zinc-200 bg-paper p-3 transition-colors hover:border-zinc-400"
    role="link"
    tabindex="0"
    @click="open"
    @keydown.enter="open"
  >
    <div class="flex items-baseline justify-between gap-2">
      <span class="font-mono text-xs">#{{ claim.claimNo }}</span>
      <span class="stamp text-zinc-400">{{ daysSince(claim.reportedAt) }}d</span>
    </div>

    <p class="mt-1.5 truncate text-sm font-medium leading-snug">
      {{ claim.customer }}
    </p>
    <p class="truncate text-xs text-zinc-500">
      <template v-if="claim.lossType">{{ claim.lossType }} · </template>{{ LINE_LABELS[claim.line] ?? claim.line }}
    </p>

    <StatusBadge v-if="claim.subStatus" class="mt-1.5" :status="claim.status" :sub-status="claim.subStatus" sub-only />

    <div class="mt-2.5 flex items-center justify-between">
      <span class="font-mono text-xs">{{ formatCentsShort(claim.reserveCents) }}</span>
      <span
        v-if="claim.assigneeName"
        :title="claim.assigneeName"
        class="flex size-6 items-center justify-center rounded-full bg-ink font-mono text-[10px] text-paper"
      >{{ initials(claim.assigneeName) }}</span>
      <span
        v-else
        title="Unassigned"
        class="size-6 rounded-full border border-dashed border-zinc-400"
      />
    </div>
  </article>
</template>
