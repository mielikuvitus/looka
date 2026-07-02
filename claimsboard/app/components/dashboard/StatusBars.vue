<script setup lang="ts">
// Five horizontal ink bars on a zinc track, scaled to the busiest status.
// Each row is a link into the pre-filtered claims list.
import { STATUS_LABELS } from '~/utils/format'

const props = defineProps<{
  rows: Array<{ status: string, count: number }>
}>()

const max = computed(() => Math.max(1, ...props.rows.map(r => r.count)))
</script>

<template>
  <ul>
    <li v-for="row in rows" :key="row.status">
      <NuxtLink
        :to="{ path: '/claims', query: { status: row.status } }"
        class="group grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 py-2"
      >
        <span class="stamp truncate text-zinc-500 transition-colors group-hover:text-ink">
          {{ STATUS_LABELS[row.status] ?? row.status }}
        </span>
        <span class="h-2 overflow-hidden bg-zinc-200">
          <span
            class="block h-full bg-ink transition-[width] duration-300"
            :style="{ width: `${(row.count / max) * 100}%` }"
          />
        </span>
        <span class="text-right font-mono text-sm tabular-nums">
          {{ row.count }}
        </span>
      </NuxtLink>
    </li>
  </ul>
</template>
