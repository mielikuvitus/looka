<script setup lang="ts">
// The kanban heart of the app: five status columns, drag = status change.
// Optimistic move, rollback + toast on failure; the server writes the
// status_change event itself, so history stays truthful for free.
import type { BoardClaim } from '~/components/board/ClaimCard.vue'
import type { Status } from '~/utils/format'
import { STATUS_LABELS, STATUS_ORDER } from '~/utils/format'

definePageMeta({ layout: 'app', middleware: 'auth', title: 'Board' })
useHead({ title: 'Board — Claimsboard' })

const { data: claims, status: fetchStatus, error, refresh } = await useFetch<BoardClaim[]>('/api/claims', { lazy: true })

// Columns as reactive arrays vue-draggable-plus can mutate on drop.
const cols = reactive<Record<Status, BoardClaim[]>>({
  new: [],
  in_review: [],
  awaiting_docs: [],
  approved: [],
  paid: [],
})
watch(claims, (list) => {
  for (const s of STATUS_ORDER)
    cols[s] = (list ?? []).filter(c => c.status === s)
}, { immediate: true })

const { patch } = useClaims()
const toast = useToast()

// After a cross-column drop, whatever sits in this column with a stale
// .status is the moved card. On failure we put it back locally and at once —
// never leaving a stale card that a later drop would re-sweep and re-PATCH.
async function onDrop(status: Status) {
  const moved = cols[status].filter(c => c.status !== status)
  for (const claim of moved) {
    const from = claim.status
    claim.status = status // optimistic
    try {
      await patch(claim.id, { status }, { silent: true })
    }
    catch {
      claim.status = from
      const i = cols[status].indexOf(claim)
      if (i !== -1)
        cols[status].splice(i, 1)
      cols[from].push(claim)
      toast.add({
        title: `Could not move #${claim.claimNo}`,
        description: 'Put it back — try again.',
        icon: 'i-lucide-octagon-alert',
      })
    }
  }
}

const showNew = ref(false)
async function onCreated() {
  showNew.value = false
  await refresh()
}
</script>

<template>
  <div class="flex h-full flex-col px-4 py-6 md:px-6">
    <div class="flex shrink-0 items-center justify-between gap-4">
      <p class="stamp text-zinc-500">
        {{ claims?.length ?? 0 }} claims on the board
      </p>
      <UButton
        color="primary"
        icon="i-lucide-plus"
        label="New claim"
        @click="() => { showNew = true }"
      />
    </div>

    <p v-if="error" class="mt-6 border border-zinc-300 px-4 py-3 text-sm text-zinc-600">
      The board did not load — refresh to try again.
    </p>

    <ClientOnly v-else>
      <div class="mt-5 flex min-h-0 flex-1 gap-4 overflow-x-auto pb-4">
        <BoardColumn
          v-for="s in STATUS_ORDER"
          :key="s"
          v-model="cols[s]"
          :status="s"
          :label="STATUS_LABELS[s] ?? s"
          @drop="onDrop(s)"
        />
      </div>

      <!-- SSR + Sortable don't mix: render a quiet silhouette until mounted -->
      <template #fallback>
        <div class="mt-5 flex flex-1 gap-4 overflow-x-hidden pb-4">
          <div v-for="s in STATUS_ORDER" :key="s" class="w-64 shrink-0 xl:w-auto xl:min-w-0 xl:flex-1">
            <div class="stamp border-t-2 border-ink pt-2 text-zinc-500">
              {{ STATUS_LABELS[s] }}
            </div>
            <div class="mt-3 space-y-2">
              <USkeleton v-for="i in fetchStatus === 'pending' ? 3 : (cols[s].length || 1)" :key="i" class="h-28 w-full rounded-none" />
            </div>
          </div>
        </div>
      </template>
    </ClientOnly>

    <NewClaimModal v-model:open="showNew" :claims="claims ?? []" @created="onCreated" />
  </div>
</template>
