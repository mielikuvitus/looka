<script setup lang="ts">
import type { ClaimFile, ClaimParty } from '~/types/claim'
import { PARTY_ROLE_LABELS } from '~/utils/format'

const props = defineProps<{ claim: ClaimFile }>()
const emit = defineEmits<{ changed: [] }>()

const adding = ref(false)

const { addParty, removeParty } = useClaims()

async function onAdd(payload: { role: string, name: string, contact?: string, org?: string }) {
  await addParty(props.claim.id, payload)
  adding.value = false
  emit('changed')
}

async function remove(party: ClaimParty) {
  // eslint-disable-next-line no-alert
  if (!window.confirm(`Remove ${party.name} from the file?`))
    return
  await removeParty(props.claim.id, party.id)
  emit('changed')
}
</script>

<template>
  <div>
    <EmptyState
      v-if="!claim.parties.length"
      icon="i-lucide-users"
      title="No parties on file"
      hint="At minimum the insured belongs here — add whoever the claim touches."
    />

    <ul v-else class="divide-y divide-zinc-200 border-y border-zinc-200">
      <li v-for="p in claim.parties" :key="p.id" class="flex items-center gap-4 py-3">
        <span class="stamp w-24 shrink-0 text-zinc-500 sm:w-28">{{ PARTY_ROLE_LABELS[p.role] ?? p.role }}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium">{{ p.name }}</span>
          <span v-if="p.org && p.org !== p.name" class="block truncate text-xs text-zinc-500">{{ p.org }}</span>
        </span>
        <span v-if="p.contact" class="hidden font-mono text-xs text-zinc-500 sm:inline">{{ p.contact }}</span>
        <button
          type="button"
          class="shrink-0 text-zinc-400 hover:text-ink"
          :title="`Remove ${p.name}`"
          @click="remove(p)"
        >
          <UIcon name="i-lucide-x" class="size-4" />
        </button>
      </li>
    </ul>

    <div class="mt-5">
      <UButton
        v-if="!adding"
        variant="ghost"
        color="neutral"
        icon="i-lucide-user-plus"
        label="Add party"
        @click="() => { adding = true }"
      />
      <PartyForm v-else @submit="onAdd" @cancel="adding = false" />
    </div>
  </div>
</template>
