<script setup lang="ts">
import type { ClaimFile } from '~/types/claim'
import { daysSince, formatCents, formatDate, LINE_LABELS } from '~/utils/format'

const props = defineProps<{ claim: ClaimFile }>()
defineEmits<{ money: [] }>()

const facts = computed(() => [
  { label: 'Policy', value: props.claim.policyNo, mono: true },
  { label: 'Line', value: LINE_LABELS[props.claim.line] ?? props.claim.line },
  { label: 'Loss type', value: props.claim.lossType ?? '—' },
  { label: 'Loss date', value: props.claim.lossDate ? formatDate(props.claim.lossDate) : '—' },
  { label: 'Location', value: props.claim.location ?? '—' },
  { label: 'Reported', value: `${formatDate(props.claim.reportedAt)} · ${daysSince(props.claim.reportedAt)}d ago` },
  { label: 'Assignee', value: props.claim.assignee?.name ?? 'unassigned' },
])

const money = computed(() => [
  { label: 'Reserve', cents: props.claim.reserveCents },
  { label: 'Deductible', cents: props.claim.deductibleCents },
  { label: 'Settlement', cents: props.claim.settlementCents },
  { label: 'Paid', cents: props.claim.paidCents },
])
</script>

<template>
  <div>
    <p v-if="claim.description" class="max-w-2xl font-serif text-lg leading-relaxed">
      {{ claim.description }}
    </p>
    <p v-else class="stamp text-zinc-400">
      No description on file yet
    </p>

    <div class="mt-8 grid grid-cols-2 gap-px border border-zinc-200 bg-zinc-200 sm:grid-cols-3 lg:grid-cols-4">
      <div v-for="f in facts" :key="f.label" class="bg-paper p-4">
        <dt class="stamp text-zinc-500">
          {{ f.label }}
        </dt>
        <dd class="mt-1 text-sm" :class="f.mono ? 'font-mono' : ''">
          {{ f.value }}
        </dd>
      </div>
    </div>

    <h3 class="stamp mt-8 text-zinc-500">
      Money
    </h3>
    <button
      type="button"
      class="mt-2 grid w-full grid-cols-2 gap-px border border-zinc-200 bg-zinc-200 text-left sm:grid-cols-4"
      title="Open the Money tab"
      @click="$emit('money')"
    >
      <span v-for="m in money" :key="m.label" class="bg-paper p-4 transition-colors hover:bg-zinc-100">
        <span class="stamp block text-zinc-500">{{ m.label }}</span>
        <span class="mt-1 block font-mono text-sm">{{ formatCents(m.cents) }}</span>
      </span>
    </button>
  </div>
</template>
