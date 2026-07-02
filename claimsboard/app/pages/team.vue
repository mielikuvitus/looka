<script setup lang="ts">
interface TeamUser {
  id: string
  name: string
  email: string
  role: 'handler' | 'manager'
}

interface WorkloadRow {
  user: TeamUser
  open: number
  pastSla: number
  awaitingDocs: number
  reserveCents: number
  oldestDays: number
  over: boolean
}

interface BriefClaim {
  id: string
  claimNo: string
  customer: string
  line: string
  status: string
  subStatus: string | null
  reportedAt: string
  reserveCents: number
  assigneeId: string | null
  assigneeName: string | null
}

interface TeamData {
  softCap: number
  slaDays: number
  workload: WorkloadRow[]
  pastSla: BriefClaim[]
  unassigned: BriefClaim[]
  overloaded: Array<{ user: TeamUser, open: number }>
}

definePageMeta({ layout: 'app', middleware: ['auth', 'manager'], title: 'Team' })
useHead({ title: 'Team — Claimsboard' })

// lazy: SSR still fills the payload on first load; client-side navigation
// shows the skeleton instead of blocking.
const { data, status, error, refresh } = useFetch<TeamData>('/api/team', { lazy: true })

const handlers = computed(() => (data.value?.workload ?? []).map(w => w.user))
</script>

<template>
  <div class="px-4 py-6 md:px-6">
    <!-- loading -->
    <div v-if="status === 'pending' && !data" class="space-y-10">
      <section>
        <USkeleton class="h-3 w-48 rounded-none" />
        <div class="mt-4 divide-y divide-zinc-200 border border-zinc-200">
          <div v-for="i in 2" :key="i" class="flex items-center gap-6 px-4 py-4">
            <USkeleton class="size-9 rounded-full" />
            <USkeleton class="h-4 w-36 rounded-none" />
            <USkeleton class="h-2.5 flex-1 rounded-none" />
            <USkeleton class="hidden h-8 w-64 rounded-none sm:block" />
          </div>
        </div>
      </section>
      <section>
        <USkeleton class="h-3 w-36 rounded-none" />
        <div class="mt-4 grid gap-6 lg:grid-cols-2">
          <USkeleton v-for="i in 2" :key="i" class="h-56 rounded-none" />
        </div>
      </section>
    </div>

    <!-- error -->
    <p v-else-if="error" class="border border-zinc-200 px-4 py-3 text-sm text-zinc-600">
      Could not load the team desk — {{ error.statusMessage ?? error.message }}
    </p>

    <div v-else-if="data" class="space-y-10">
      <!-- workload per handler -->
      <section>
        <p class="stamp text-zinc-500">
          Workload — soft cap {{ data.softCap }}
        </p>
        <div class="mt-4 divide-y divide-zinc-200 border border-zinc-200">
          <WorkloadBar
            v-for="w in data.workload"
            :key="w.user.id"
            :row="w"
            :soft-cap="data.softCap"
          />
        </div>
      </section>

      <!-- needs attention -->
      <section>
        <p class="stamp text-zinc-500">
          Needs attention
        </p>

        <div v-if="data.overloaded.length" class="mt-4 space-y-1 border border-zinc-200 px-4 py-3">
          <p
            v-for="o in data.overloaded"
            :key="o.user.id"
            class="flex items-center gap-2 text-sm text-zinc-600"
          >
            <UIcon name="i-lucide-info" class="size-4 shrink-0 text-zinc-400" />
            <span>
              {{ o.user.name }} holds {{ o.open }} open claims —
              <NuxtLink to="/board" class="underline underline-offset-2 hover:text-ink">consider reassigning</NuxtLink>
            </span>
          </p>
        </div>

        <div class="mt-4 grid items-start gap-6 lg:grid-cols-2">
          <NeedsAttentionList
            :title="`Past SLA (${data.slaDays}d)`"
            :claims="data.pastSla"
            empty-icon="i-lucide-badge-check"
            empty-title="Nothing past SLA — good desk"
            :empty-hint="`Every open claim is inside the ${data.slaDays}-day window.`"
          />
          <NeedsAttentionList
            title="Unassigned"
            :claims="data.unassigned"
            :handlers="handlers"
            empty-icon="i-lucide-user-check"
            empty-title="No unassigned claims"
            empty-hint="Every open claim has a handler on it."
            @assigned="refresh()"
          />
        </div>
      </section>
    </div>
  </div>
</template>
