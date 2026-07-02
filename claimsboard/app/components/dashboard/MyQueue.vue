<script setup lang="ts">
// The signed-in user's open claims, oldest first. Managers hold no claims by
// design, so their empty state points at the Team view instead of apologising.
import { daysSince, formatCentsShort } from '~/utils/format'

defineProps<{
  claims: Array<{
    id: string
    claimNo: string
    customer: string
    status: string
    subStatus: string | null
    reportedAt: string
    reserveCents: number
  }>
}>()

const { isManager } = useAuth()
</script>

<template>
  <ul v-if="claims.length" class="divide-y divide-zinc-200">
    <li v-for="c in claims" :key="c.id">
      <NuxtLink :to="`/claims/${c.id}`" class="group flex items-center gap-3 py-2.5">
        <span class="shrink-0 font-mono text-sm text-zinc-500 transition-colors group-hover:text-ink">
          #{{ c.claimNo }}
        </span>
        <span class="min-w-0 flex-1 truncate text-sm font-medium">
          {{ c.customer }}
        </span>
        <StatusBadge :status="c.status" :sub-status="c.subStatus" />
        <span class="hidden w-9 shrink-0 text-right font-mono text-sm tabular-nums text-zinc-500 sm:inline">
          {{ daysSince(c.reportedAt) }}d
        </span>
        <span class="hidden w-16 shrink-0 text-right font-mono text-sm sm:inline">
          {{ formatCentsShort(c.reserveCents) }}
        </span>
      </NuxtLink>
    </li>
  </ul>
  <EmptyState
    v-else
    icon="i-lucide-armchair"
    title="Nothing on your desk"
    :hint="isManager
      ? 'Managers hold no claims. The workload of the whole room lives on the Team page.'
      : 'Claims assigned to you land here, oldest first. A clear desk is a fine thing.'"
  >
    <UButton
      v-if="isManager"
      to="/team"
      variant="outline"
      color="neutral"
      size="sm"
      icon="i-lucide-users"
      label="Open Team view"
    />
  </EmptyState>
</template>
