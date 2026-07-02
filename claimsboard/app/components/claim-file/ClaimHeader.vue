<script setup lang="ts">
import type { ClaimFile } from '~/types/claim'
import { daysSince, formatDate, LINE_LABELS, STATUS_LABELS, STATUS_ORDER } from '~/utils/format'

const props = defineProps<{ claim: ClaimFile }>()
const emit = defineEmits<{ changed: [] }>()

const { patch } = useClaims()
const pending = ref(false)

async function apply(body: Record<string, unknown>) {
  pending.value = true
  try {
    await patch(props.claim.id, body)
    emit('changed')
  }
  finally {
    pending.value = false
  }
}

// One contextual primary action per status — the next sensible step.
const primary = computed(() => ({
  new: { label: 'Start review', icon: 'i-lucide-eye', body: { status: 'in_review' } },
  in_review: { label: 'Approve', icon: 'i-lucide-check', body: { status: 'approved' } },
  awaiting_docs: { label: 'Back to review', icon: 'i-lucide-undo-2', body: { status: 'in_review' } },
  approved: {
    label: 'Mark paid',
    icon: 'i-lucide-banknote',
    body: { status: 'paid', paidCents: props.claim.settlementCents || props.claim.reserveCents },
  },
  paid: null,
}[props.claim.status] ?? null))

const menuItems = computed(() => {
  const moves = STATUS_ORDER
    .filter(s => s !== props.claim.status)
    .map(s => ({
      label: `Move to ${STATUS_LABELS[s]}`,
      icon: 'i-lucide-arrow-right',
      onSelect: () => apply({ status: s }),
    }))
  const subs = [
    props.claim.subStatus === 'denied'
      ? { label: 'Clear denied', icon: 'i-lucide-rotate-ccw', onSelect: () => apply({ subStatus: null }) }
      : { label: 'Mark denied', icon: 'i-lucide-ban', onSelect: () => apply({ subStatus: 'denied' }) },
    props.claim.subStatus === 'reopened'
      ? { label: 'Clear reopened', icon: 'i-lucide-rotate-ccw', onSelect: () => apply({ subStatus: null }) }
      : { label: 'Mark reopened', icon: 'i-lucide-folder-sync', onSelect: () => apply({ subStatus: 'reopened' }) },
  ]
  return [moves, subs]
})

const meta = computed(() => [
  LINE_LABELS[props.claim.line] ?? props.claim.line,
  props.claim.lossType,
  `reported ${formatDate(props.claim.reportedAt)} · ${daysSince(props.claim.reportedAt)}d ago`,
  props.claim.location,
  props.claim.policyNo,
  props.claim.assignee ? `with ${props.claim.assignee.name}` : 'unassigned',
].filter(Boolean).join('  ·  '))
</script>

<template>
  <header>
    <NuxtLink to="/claims" class="stamp text-zinc-400 hover:text-ink">
      ← Claims
    </NuxtLink>

    <div class="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <h2 class="flex items-baseline gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
          <span class="font-mono">#{{ claim.claimNo }}</span>
          <span class="text-zinc-300">·</span>
          <span class="truncate font-serif">{{ claim.customer }}</span>
        </h2>
        <StatusBadge :status="claim.status" :sub-status="claim.subStatus" />
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <UDropdownMenu :items="menuItems">
          <UButton
            variant="outline"
            color="neutral"
            trailing-icon="i-lucide-chevron-down"
            label="Move to…"
            :disabled="pending"
          />
        </UDropdownMenu>
        <UButton
          v-if="primary"
          color="primary"
          :icon="primary.icon"
          :label="primary.label"
          :loading="pending"
          @click="apply(primary.body)"
        />
      </div>
    </div>

    <p class="stamp mt-3 text-zinc-500">
      {{ meta }}
    </p>
  </header>
</template>
