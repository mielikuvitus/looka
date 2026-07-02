<script setup lang="ts">
// The claim FILE — a folder you open, not a table row. Header + hand-rolled
// tab bar (Documents first, the wireframe's choice) over one useFetch that
// every write refreshes so tabs and history stay truthful.
import type { ActivityItem, Status } from '~/utils/format'

definePageMeta({ layout: 'app', middleware: 'auth', title: 'Claim' })

interface Party {
  id: string
  claimId: string
  role: string
  name: string
  contact: string | null
  org: string | null
  createdAt: string
}

interface Doc {
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

interface ClaimDetail {
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
  parties: Party[]
  docs: Doc[]
  events: ActivityItem[]
  assignee: { id: string, name: string } | null
}

const route = useRoute()
const router = useRouter()

// lazy: SSR still renders with data; client-side nav shows the skeleton.
const { data, refresh, error } = useFetch<ClaimDetail>(
  () => `/api/claims/${route.params.id}`,
  { lazy: true },
)

useHead({
  title: () => data.value
    ? `#${data.value.claimNo} ${data.value.customer} — Claimsboard`
    : 'Claim — Claimsboard',
})

// ---- Tabs (?tab= synced so reloads keep the spot) ----

const TAB_KEYS = ['overview', 'documents', 'parties', 'money', 'activity'] as const
type TabKey = typeof TAB_KEYS[number]

const tab = computed<TabKey>(() => {
  const raw = route.query.tab
  const t = Array.isArray(raw) ? raw[0] : raw
  return (TAB_KEYS as readonly string[]).includes(t ?? '') ? t as TabKey : 'documents'
})

function setTab(t: TabKey) {
  router.replace({ query: { ...route.query, tab: t } })
}

const tabs = computed<Array<{ key: TabKey, label: string, count?: number }>>(() => [
  { key: 'overview', label: 'Overview' },
  { key: 'documents', label: 'Documents', count: data.value?.docs.length ?? 0 },
  { key: 'parties', label: 'Parties', count: data.value?.parties.length ?? 0 },
  { key: 'money', label: 'Money' },
  { key: 'activity', label: 'Activity', count: data.value?.events.length ?? 0 },
])
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-6 md:px-6">
    <template v-if="data">
      <ClaimHeader :claim="data" @changed="refresh" />

      <nav class="mt-6 flex gap-5 overflow-x-auto border-b border-zinc-200 md:gap-7" aria-label="Claim file sections">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          class="stamp -mb-px shrink-0 whitespace-nowrap border-b-2 pb-2.5 transition-colors"
          :class="tab === t.key ? 'border-ink text-ink' : 'border-transparent text-zinc-400 hover:text-zinc-600'"
          @click="setTab(t.key)"
        >
          {{ t.label }}<template v-if="t.count !== undefined"> ({{ t.count }})</template>
        </button>
      </nav>

      <div class="py-6">
        <ClaimOverview v-if="tab === 'overview'" :claim="data" @money="setTab('money')" />
        <ClaimDocuments v-else-if="tab === 'documents'" :claim="data" @changed="refresh" />
        <ClaimParties v-else-if="tab === 'parties'" :claim="data" @changed="refresh" />
        <ClaimMoney v-else-if="tab === 'money'" :claim="data" @changed="refresh" />
        <ClaimActivity v-else :claim="data" @changed="refresh" />
      </div>
    </template>

    <div v-else-if="error" class="mx-auto max-w-md py-16">
      <EmptyState
        icon="i-lucide-file-question"
        title="This claim file can't be opened"
        hint="It may have been deleted, or the link is stale."
      >
        <UButton to="/claims" variant="outline" color="neutral" label="← Back to claims" />
      </EmptyState>
    </div>

    <!-- Loading: the file's real silhouette in skeletons -->
    <div v-else>
      <USkeleton class="h-3 w-20 rounded-none" />
      <div class="mt-4 flex flex-wrap items-center justify-between gap-4">
        <USkeleton class="h-9 w-72 max-w-full rounded-none" />
        <USkeleton class="h-9 w-56 rounded-none" />
      </div>
      <USkeleton class="mt-3 h-3 w-96 max-w-full rounded-none" />
      <USkeleton class="mt-8 h-8 w-full rounded-none" />
      <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <USkeleton v-for="i in 4" :key="i" class="aspect-[4/3] rounded-none" />
      </div>
      <USkeleton class="mt-6 h-32 w-full rounded-none" />
    </div>
  </div>
</template>
