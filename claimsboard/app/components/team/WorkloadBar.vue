<script setup lang="ts">
import { formatCentsShort, initials } from '~/utils/format'

interface HandlerUser {
  id: string
  name: string
  email: string
  role: 'handler' | 'manager'
}

interface WorkloadRow {
  user: HandlerUser
  open: number
  pastSla: number
  awaitingDocs: number
  reserveCents: number
  oldestDays: number
  over: boolean
}

const props = defineProps<{
  row: WorkloadRow
  softCap: number
}>()

// One cell per claim slot, ledger-style. Slots past the soft cap render as
// hatched ink — overflow is visibly a different substance, not just more bar.
const cells = computed(() => {
  const total = Math.max(props.row.open, props.softCap)
  return Array.from({ length: total }, (_, i) =>
    i >= props.row.open ? 'empty' : i < props.softCap ? 'filled' : 'over')
})

const hatch = {
  backgroundImage: 'repeating-linear-gradient(135deg, var(--color-ink) 0px, var(--color-ink) 2px, transparent 2px, transparent 5px)',
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
    <!-- identity -->
    <div class="flex w-52 min-w-0 shrink-0 items-center gap-3">
      <span class="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-300 font-mono text-xs">
        {{ initials(row.user.name) }}
      </span>
      <div class="min-w-0">
        <p class="truncate text-sm font-medium">
          {{ row.user.name }}
        </p>
        <p class="stamp text-zinc-400">
          {{ row.user.role }}
        </p>
      </div>
    </div>

    <!-- load bar: open claims vs soft cap -->
    <div
      class="flex min-w-44 flex-1 items-center gap-3"
      role="img"
      :aria-label="`${row.open} open claims against a soft cap of ${softCap}`"
    >
      <div class="flex h-2.5 flex-1 gap-px">
        <span
          v-for="(cell, i) in cells"
          :key="i"
          class="flex-1"
          :class="[
            cell === 'filled' && 'bg-ink',
            cell === 'empty' && 'bg-zinc-200',
            cell === 'over' && 'border border-ink',
            cell === 'over' && i === softCap && 'ml-0.5',
          ]"
          :style="cell === 'over' ? hatch : undefined"
        />
      </div>
      <span v-if="row.over" class="stamp shrink-0 bg-ink px-1.5 py-0.5 text-paper">
        Over cap
      </span>
    </div>

    <!-- figures -->
    <div class="flex shrink-0 items-start gap-5 text-right">
      <div class="w-14">
        <p class="font-mono text-sm" :class="row.over && 'font-semibold'">
          {{ row.open }}<span class="text-zinc-400">/{{ softCap }}</span>
        </p>
        <p class="stamp text-zinc-400">
          Open
        </p>
      </div>
      <div class="w-18">
        <p class="font-mono text-sm" :class="row.pastSla ? 'font-semibold' : 'text-zinc-400'">
          {{ row.pastSla }}
        </p>
        <p class="stamp text-zinc-400">
          Past SLA
        </p>
      </div>
      <div class="hidden w-12 sm:block">
        <p class="font-mono text-sm" :class="!row.awaitingDocs && 'text-zinc-400'">
          {{ row.awaitingDocs }}
        </p>
        <p class="stamp text-zinc-400">
          Docs
        </p>
      </div>
      <div class="hidden w-20 sm:block">
        <p class="font-mono text-sm">
          {{ formatCentsShort(row.reserveCents) }}
        </p>
        <p class="stamp text-zinc-400">
          Σ Reserve
        </p>
      </div>
      <div class="hidden w-14 sm:block">
        <p class="font-mono text-sm">
          {{ row.oldestDays }}d
        </p>
        <p class="stamp text-zinc-400">
          Oldest
        </p>
      </div>
    </div>
  </div>
</template>
