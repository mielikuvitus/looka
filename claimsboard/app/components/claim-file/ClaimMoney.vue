<script setup lang="ts">
import type { ClaimFile } from '~/types/claim'
import { formatCents } from '~/utils/format'

const props = defineProps<{ claim: ClaimFile }>()
const emit = defineEmits<{ changed: [] }>()

// Edited in EUROS at the edge; stored as integer cents. Only changed fields
// are PATCHed — a paid change makes the server write a payment event.
const FIELDS = [
  { key: 'reserveCents', label: 'Reserve', hint: 'what we expect this to cost' },
  { key: 'deductibleCents', label: 'Deductible', hint: 'the customer\'s share' },
  { key: 'settlementCents', label: 'Settlement', hint: 'the agreed amount' },
  { key: 'paidCents', label: 'Paid', hint: 'changing this writes a payment event' },
] as const
type MoneyKey = typeof FIELDS[number]['key']

const euros = reactive<Record<MoneyKey, number>>({
  reserveCents: 0,
  deductibleCents: 0,
  settlementCents: 0,
  paidCents: 0,
})

// Sync from the server, but never clobber a field the user is mid-editing:
// on a refresh (prev defined) only overwrite fields still matching the old
// server value. On first run (prev undefined) initialise everything.
watch(() => props.claim, (c, prev) => {
  for (const f of FIELDS) {
    const untouched = !prev || Math.round(euros[f.key] * 100) === prev[f.key]
    if (untouched)
      euros[f.key] = c[f.key] / 100
  }
}, { immediate: true })

const changed = computed(() =>
  FIELDS.filter(f => Math.round(euros[f.key] * 100) !== props.claim[f.key]))

const outstanding = computed(() =>
  Math.round(euros.settlementCents * 100) - Math.round(euros.paidCents * 100))

const { patch } = useClaims()
const toast = useToast()
const pending = ref(false)

async function save() {
  if (!changed.value.length)
    return
  const body: Partial<Record<MoneyKey, number>> = {}
  for (const f of changed.value)
    body[f.key] = Math.round(euros[f.key] * 100)
  pending.value = true
  try {
    await patch(props.claim.id, body)
    toast.add({ title: 'Money updated', icon: 'i-lucide-banknote' })
    emit('changed')
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <div class="grid grid-cols-1 gap-px border border-zinc-200 bg-zinc-200 sm:grid-cols-2">
      <div v-for="f in FIELDS" :key="f.key" class="bg-paper p-4">
        <label :for="`money-${f.key}`" class="stamp text-zinc-500">{{ f.label }}</label>
        <div class="mt-2 flex items-center gap-2">
          <span class="font-mono text-sm text-zinc-400">€</span>
          <UInput
            :id="`money-${f.key}`"
            v-model.number="euros[f.key]"
            type="number"
            min="0"
            step="50"
            class="w-full font-mono"
          />
        </div>
        <p class="mt-1.5 text-xs text-zinc-400">
          {{ f.hint }}
        </p>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p class="font-mono text-sm" :class="outstanding > 0 ? 'text-ink' : 'text-zinc-400'">
        outstanding {{ formatCents(Math.max(0, outstanding)) }}
      </p>
      <UButton
        color="primary"
        :label="changed.length ? `Save money (${changed.length})` : 'Nothing to save'"
        :disabled="!changed.length"
        :loading="pending"
        @click="save"
      />
    </div>
  </div>
</template>
