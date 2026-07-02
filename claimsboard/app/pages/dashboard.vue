<script setup lang="ts">
import type { ActivityItem, Status } from '~/utils/format'
import { formatCents } from '~/utils/format'

definePageMeta({ layout: 'app', middleware: 'auth', title: 'Dashboard' })
useHead({ title: 'Dashboard — Claimsboard' })

interface Claim {
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
}

interface DashboardData {
  kpis: { open: number, awaitingDocs: number, pastSla: number, paidThisWeekCents: number }
  byStatus: Array<{ status: Status, count: number }>
  myQueue: Claim[]
  activity: ActivityItem[]
}

// lazy: SSR still renders with data; client-side navigation shows the
// skeleton in the real layout instead of blocking.
const { data, status, error } = await useFetch<DashboardData>('/api/dashboard', { lazy: true })

const total = computed(() => data.value?.byStatus.reduce((n, r) => n + r.count, 0) ?? 0)
</script>

<template>
  <div class="px-4 py-6 md:px-6">
    <!-- Loading: same bones as the loaded page -->
    <div v-if="status === 'pending'">
      <div class="grid grid-cols-2 gap-px border border-zinc-200 bg-zinc-200 lg:grid-cols-4">
        <div v-for="i in 4" :key="i" class="bg-paper p-5">
          <USkeleton class="h-3 w-24" />
          <USkeleton class="mt-3 h-9 w-16" />
          <USkeleton class="mt-2 h-3 w-20" />
        </div>
      </div>
      <div class="mt-10 grid gap-10 lg:grid-cols-2">
        <div class="space-y-3">
          <USkeleton class="h-3 w-32" />
          <USkeleton v-for="i in 5" :key="i" class="h-6 w-full" />
        </div>
        <div class="space-y-3">
          <USkeleton class="h-3 w-20" />
          <USkeleton v-for="i in 7" :key="i" class="h-6 w-full" />
        </div>
      </div>
    </div>

    <p v-else-if="error" class="border border-zinc-200 px-4 py-3 text-sm text-zinc-600">
      The dashboard did not load{{ error.statusMessage ? ` — ${error.statusMessage}` : '' }}. Refresh to try again.
    </p>

    <template v-else-if="data">
      <!-- KPI row: shared hairlines via the gap-px grid -->
      <div class="grid grid-cols-2 gap-px border border-zinc-200 bg-zinc-200 lg:grid-cols-4">
        <DashboardKpi
          label="Open claims"
          :value="String(data.kpis.open)"
          :hint="`of ${total} total`"
        />
        <DashboardKpi
          label="Awaiting docs"
          :value="String(data.kpis.awaitingDocs)"
          hint="target < 2"
        />
        <DashboardKpi
          label="Past SLA"
          :value="String(data.kpis.pastSla)"
          :hint="data.kpis.pastSla > 0 ? '> 7 days' : 'all inside SLA'"
          :inverted="data.kpis.pastSla > 0"
        />
        <DashboardKpi
          label="Paid this week"
          :value="formatCents(data.kpis.paidThisWeekCents)"
          hint="last 7 days"
        />
      </div>

      <div class="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-2">
        <div>
          <section>
            <h2 class="stamp text-zinc-500">
              Claims by status
            </h2>
            <StatusBars class="mt-3" :rows="data.byStatus" />
          </section>

          <section class="mt-10">
            <h2 class="stamp text-zinc-500">
              My queue
            </h2>
            <MyQueue class="mt-3" :claims="data.myQueue" />
          </section>
        </div>

        <section>
          <h2 class="stamp text-zinc-500">
            Activity
          </h2>
          <ActivityFeed class="mt-1" :items="data.activity" show-claim />
        </section>
      </div>
    </template>
  </div>
</template>
