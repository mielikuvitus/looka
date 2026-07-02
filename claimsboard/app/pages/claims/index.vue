<script setup lang="ts">
// The registry: every claim in one hand-set ledger table. Filters live in the
// URL (?q= from the header search, ?status= from dashboard links) so views
// are shareable; the actual filtering is client-side.
import { daysSince, formatCents, formatDate, initials, LINE_LABELS } from '~/utils/format'

definePageMeta({ layout: 'app', middleware: 'auth', title: 'Claims' })
useHead({ title: 'Claims — Claimsboard' })

interface ClaimRow {
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
  deductibleCents: number | null
  settlementCents: number | null
  assigneeId: string | null
  createdAt: string
  updatedAt: string
  assigneeName: string | null
}

// lazy: SSR renders with data; client-side nav shows the skeleton below
// instead of blocking the whole route on the fetch.
const { data: claims, status: fetchStatus, error } = await useFetch<ClaimRow[]>('/api/claims', { lazy: true })

// --- Filter state, seeded from the URL ---------------------------------
const route = useRoute()
const router = useRouter()

function fromQuery(v: unknown): string {
  if (Array.isArray(v))
    return String(v[0] ?? '')
  return typeof v === 'string' ? v : ''
}

const q = ref(fromQuery(route.query.q))
const status = ref(fromQuery(route.query.status))
const line = ref(fromQuery(route.query.line))
const subStatus = ref(fromQuery(route.query.sub))

// Filters → URL. Empty keys are dropped so a clean view has a clean URL.
watch([q, status, line, subStatus], () => {
  const query: Record<string, string> = {}
  if (q.value)
    query.q = q.value
  if (status.value)
    query.status = status.value
  if (line.value)
    query.line = line.value
  if (subStatus.value)
    query.sub = subStatus.value
  router.replace({ query })
})

// URL → filters, so the global header search works while already on /claims.
// (Same-value ref writes don't re-trigger, so this can't ping-pong.)
watch(() => route.query, (query) => {
  q.value = fromQuery(query.q)
  status.value = fromQuery(query.status)
  line.value = fromQuery(query.line)
  subStatus.value = fromQuery(query.sub)
})

// --- Client-side filtering ----------------------------------------------
const filtered = computed(() => {
  const needle = q.value.trim().toLowerCase().replace(/^#/, '')
  return (claims.value ?? []).filter(c =>
    (!status.value || c.status === status.value)
    && (!line.value || c.line === line.value)
    && (!subStatus.value || c.subStatus === subStatus.value)
    && (!needle
      || c.claimNo.toLowerCase().includes(needle)
      || c.customer.toLowerCase().includes(needle)))
})

const hasFilters = computed(() =>
  !!(q.value || status.value || line.value || subStatus.value))

function clearFilters() {
  q.value = ''
  status.value = ''
  line.value = ''
  subStatus.value = ''
}

function open(id: string) {
  navigateTo(`/claims/${id}`)
}
</script>

<template>
  <div class="px-4 py-6 md:px-6">
    <!-- Error: a plain bordered sentence, no toast wall. -->
    <p v-if="error" class="border border-zinc-300 px-4 py-3 text-sm text-zinc-600">
      Could not load the claims registry — try refreshing the page.
    </p>

    <!-- Loading skeleton in the page's real layout. -->
    <div v-else-if="fetchStatus === 'pending'">
      <div class="flex flex-wrap items-center gap-2">
        <USkeleton class="h-8 w-full sm:w-52" />
        <USkeleton class="hidden h-8 w-40 sm:block" />
        <USkeleton class="hidden h-8 w-36 sm:block" />
        <USkeleton class="hidden h-8 w-44 sm:block" />
      </div>
      <USkeleton class="mt-4 h-4 w-32" />
      <div class="mt-3 border-t border-ink">
        <USkeleton v-for="i in 10" :key="i" class="mt-px h-11 w-full" />
      </div>
    </div>

    <template v-else>
      <ClaimsFilters
        v-model:q="q"
        v-model:status="status"
        v-model:line="line"
        v-model:sub-status="subStatus"
      />

      <p class="stamp mt-5 text-zinc-500">
        {{ filtered.length }} of {{ (claims ?? []).length }} claims
      </p>

      <EmptyState
        v-if="!filtered.length"
        icon="i-lucide-search-x"
        title="No claims match"
        :hint="hasFilters ? 'Nothing in the registry fits these filters — clear them?' : 'The registry is empty.'"
        class="mt-3"
      >
        <UButton
          v-if="hasFilters"
          label="Clear filters"
          variant="outline"
          color="neutral"
          size="sm"
          @click="clearFilters"
        />
      </EmptyState>

      <table v-else class="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-ink text-zinc-500">
            <th class="stamp px-3 py-2 text-left font-normal">
              #
            </th>
            <th class="stamp px-3 py-2 text-left font-normal">
              Customer
            </th>
            <th class="stamp hidden px-3 py-2 text-left font-normal md:table-cell">
              Line
            </th>
            <th class="stamp px-3 py-2 text-left font-normal">
              Status
            </th>
            <th class="stamp hidden px-3 py-2 text-left font-normal lg:table-cell">
              Assignee
            </th>
            <th class="stamp hidden px-3 py-2 text-left font-normal sm:table-cell">
              Reported
            </th>
            <th class="stamp px-3 py-2 text-right font-normal">
              Reserve
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in filtered"
            :key="c.id"
            class="cursor-pointer border-b border-zinc-200 hover:bg-zinc-100 focus-visible:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-ink"
            role="link"
            tabindex="0"
            :aria-label="`Open claim ${c.claimNo} — ${c.customer}`"
            @click="open(c.id)"
            @keydown.enter="open(c.id)"
          >
            <td class="whitespace-nowrap px-3 py-3 font-mono">
              #{{ c.claimNo }}
            </td>
            <td class="px-3 py-3 font-medium">
              <span class="block max-w-36 truncate sm:max-w-none">{{ c.customer }}</span>
            </td>
            <td class="hidden px-3 py-3 text-zinc-600 md:table-cell">
              {{ LINE_LABELS[c.line] ?? c.line }}
            </td>
            <td class="px-3 py-3">
              <StatusBadge :status="c.status" :sub-status="c.subStatus" />
            </td>
            <td class="hidden px-3 py-3 lg:table-cell">
              <span v-if="c.assigneeName" class="flex items-center gap-2">
                <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 font-mono text-[10px]">
                  {{ initials(c.assigneeName) }}
                </span>
                <span class="truncate">{{ c.assigneeName }}</span>
              </span>
              <span v-else class="text-zinc-400">—</span>
            </td>
            <td class="hidden whitespace-nowrap px-3 py-3 font-mono sm:table-cell">
              {{ formatDate(c.reportedAt) }}
              <span class="text-zinc-400">· {{ daysSince(c.reportedAt) }}d</span>
            </td>
            <td class="whitespace-nowrap px-3 py-3 text-right font-mono">
              {{ formatCents(c.reserveCents) }}
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>
