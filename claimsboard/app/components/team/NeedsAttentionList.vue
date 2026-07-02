<script setup lang="ts">
import { daysSince, LINE_LABELS } from '~/utils/format'

interface Handler {
  id: string
  name: string
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

const props = defineProps<{
  title: string
  claims: BriefClaim[]
  /** Offer an inline assign control with these handlers; omit for a read-only list. */
  handlers?: Handler[]
  emptyTitle: string
  emptyHint?: string
  emptyIcon?: string
}>()

const emit = defineEmits<{ assigned: [] }>()

const { patch } = useClaims()
const toast = useToast()
const assigningId = ref<string | null>(null)

async function onAssign(claim: BriefClaim, value: unknown) {
  const assigneeId = typeof value === 'string' ? value : null
  if (!assigneeId || assigningId.value)
    return
  assigningId.value = claim.id
  try {
    await patch(claim.id, { assigneeId }, { silent: true })
    const name = props.handlers?.find(h => h.id === assigneeId)?.name ?? 'handler'
    toast.add({ title: `#${claim.claimNo} → ${name}`, icon: 'i-lucide-user-check' })
    emit('assigned')
  }
  catch {
    toast.add({ title: `Could not assign #${claim.claimNo}`, icon: 'i-lucide-octagon-alert' })
  }
  finally {
    assigningId.value = null
  }
}
</script>

<template>
  <section class="border border-zinc-200 bg-paper">
    <header class="flex items-baseline justify-between border-b border-zinc-200 px-4 py-2.5">
      <h3 class="stamp text-zinc-500">
        {{ title }}
      </h3>
      <span class="font-mono text-xs text-zinc-400">{{ claims.length }}</span>
    </header>

    <ul v-if="claims.length" class="divide-y divide-zinc-200">
      <li v-for="c in claims" :key="c.id" class="flex items-center gap-3 px-4 py-3">
        <NuxtLink
          :to="`/claims/${c.id}`"
          class="flex min-w-0 flex-1 items-baseline gap-2 underline-offset-2 hover:underline"
        >
          <span class="shrink-0 font-mono text-[13px]">#{{ c.claimNo }}</span>
          <span class="truncate text-sm">{{ c.customer }}</span>
        </NuxtLink>

        <span class="stamp hidden shrink-0 text-zinc-400 lg:inline">
          {{ LINE_LABELS[c.line] ?? c.line }}
        </span>

        <StatusBadge :status="c.status" :sub-status="c.subStatus" class="hidden sm:inline-flex" />

        <USelectMenu
          v-if="handlers"
          :items="handlers"
          label-key="name"
          value-key="id"
          :search-input="false"
          placeholder="Assign"
          size="xs"
          variant="outline"
          color="neutral"
          class="w-28 shrink-0"
          :loading="assigningId === c.id"
          :disabled="assigningId === c.id"
          @update:model-value="onAssign(c, $event)"
        />
        <span v-else class="hidden max-w-28 shrink-0 truncate text-sm text-zinc-500 md:inline">
          {{ c.assigneeName ?? 'Unassigned' }}
        </span>

        <span class="w-9 shrink-0 text-right font-mono text-sm font-semibold text-ink">
          {{ daysSince(c.reportedAt) }}d
        </span>
      </li>
    </ul>

    <div v-else class="p-4">
      <EmptyState :icon="emptyIcon" :title="emptyTitle" :hint="emptyHint" />
    </div>
  </section>
</template>
