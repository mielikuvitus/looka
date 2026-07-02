<script setup lang="ts">
import { STATUS_LABELS, SUB_STATUS_LABELS } from '~/utils/format'

const props = defineProps<{
  status: string
  subStatus?: string | null
  /** Render only the sub-status pill — for the board, where the column is the status. */
  subOnly?: boolean
}>()

// Monochrome status language: outline → tint → dashed → double rule → solid ink.
const cls = computed(() => ({
  new: 'border border-zinc-400 text-zinc-700',
  in_review: 'border border-transparent bg-zinc-200 text-ink',
  awaiting_docs: 'border border-dashed border-zinc-500 text-zinc-700',
  approved: 'border-[3px] border-double border-ink text-ink',
  paid: 'border border-ink bg-ink text-paper',
}[props.status] ?? 'border border-zinc-300 text-zinc-600'))
</script>

<template>
  <span
    v-if="subOnly"
    v-show="subStatus"
    class="stamp inline-flex items-center whitespace-nowrap border border-zinc-400 px-1.5 py-px text-zinc-600"
  >
    · {{ SUB_STATUS_LABELS[subStatus ?? ''] ?? subStatus }}
  </span>
  <span v-else class="stamp inline-flex items-center whitespace-nowrap px-2 py-0.5" :class="cls">
    {{ STATUS_LABELS[status] ?? status }}<template v-if="subStatus">
      &nbsp;· {{ SUB_STATUS_LABELS[subStatus] ?? subStatus }}
    </template>
  </span>
</template>
