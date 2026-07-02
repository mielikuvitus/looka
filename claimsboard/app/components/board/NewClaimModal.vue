<script setup lang="ts">
// FNOL intake, kept compact: the required trio (customer, policy, line) plus
// whatever detail the caller already has. Reserve is typed in EUROS and
// stored as integer cents.
import type { BoardClaim } from '~/components/board/ClaimCard.vue'
import { LINE_LABELS } from '~/utils/format'

const props = defineProps<{
  /** Loaded board claims — used to derive assignable people (team API is manager-only). */
  claims: BoardClaim[]
}>()

const emit = defineEmits<{ created: [] }>()

const open = defineModel<boolean>('open', { required: true })

const form = reactive({
  customer: '',
  policyNo: '',
  line: '' as string,
  lossType: '',
  lossDate: '',
  location: '',
  description: '',
  reserveEuros: null as number | null,
  assigneeId: '' as string,
})

const lineOptions = Object.entries(LINE_LABELS).map(([value, label]) => ({ value, label }))

const assigneeOptions = computed(() => {
  const seen = new Map<string, string>()
  for (const c of props.claims) {
    if (c.assigneeId && c.assigneeName)
      seen.set(c.assigneeId, c.assigneeName)
  }
  return [
    { value: '', label: 'Unassigned' },
    ...[...seen.entries()].map(([value, label]) => ({ value, label })),
  ]
})

const pending = ref(false)
const problem = ref('')

const { create } = useClaims()

async function submit() {
  problem.value = ''
  if (!form.customer.trim() || !form.policyNo.trim() || !form.line) {
    problem.value = 'Customer, policy number and line are required.'
    return
  }
  pending.value = true
  try {
    await create({
      customer: form.customer.trim(),
      policyNo: form.policyNo.trim(),
      line: form.line,
      lossType: form.lossType.trim() || undefined,
      lossDate: form.lossDate || undefined,
      location: form.location.trim() || undefined,
      description: form.description.trim() || undefined,
      reserveCents: form.reserveEuros ? Math.round(form.reserveEuros * 100) : undefined,
      assigneeId: form.assigneeId || undefined,
    })
    Object.assign(form, { customer: '', policyNo: '', line: '', lossType: '', lossDate: '', location: '', description: '', reserveEuros: null, assigneeId: '' })
    emit('created')
  }
  catch {
    // useClaims already toasted; keep the modal open for a retry
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="New claim" description="First notice of loss — the file starts here.">
    <template #body>
      <form class="space-y-4" @submit.prevent="submit">
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Customer" required>
            <UInput v-model="form.customer" placeholder="K. Hoffmann" class="w-full" />
          </UFormField>
          <UFormField label="Policy no." required>
            <UInput v-model="form.policyNo" placeholder="HR-2214-0071" class="w-full font-mono" />
          </UFormField>
          <UFormField label="Line" required>
            <USelectMenu
              v-model="form.line"
              :items="lineOptions"
              value-key="value"
              label-key="label"
              :search-input="false"
              placeholder="Pick a line"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Loss type">
            <UInput v-model="form.lossType" placeholder="water, collision, theft…" class="w-full" />
          </UFormField>
          <UFormField label="Loss date">
            <UInput v-model="form.lossDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Location">
            <UInput v-model="form.location" placeholder="Düsseldorf" class="w-full" />
          </UFormField>
          <UFormField label="Initial reserve (€)">
            <UInput v-model.number="form.reserveEuros" type="number" min="0" step="50" placeholder="0" class="w-full font-mono" />
          </UFormField>
          <UFormField label="Assignee">
            <USelectMenu
              v-model="form.assigneeId"
              :items="assigneeOptions"
              value-key="value"
              label-key="label"
              :search-input="false"
              class="w-full"
            />
          </UFormField>
        </div>
        <UFormField label="What happened">
          <UTextarea v-model="form.description" :rows="3" placeholder="Two sentences are enough to start the file." class="w-full" />
        </UFormField>

        <p v-if="problem" class="border border-ink bg-zinc-100 px-3 py-2 text-sm">
          {{ problem }}
        </p>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-end gap-2">
        <UButton variant="ghost" color="neutral" label="Cancel" @click="() => { open = false }" />
        <UButton color="primary" :loading="pending" label="Open claim" @click="submit" />
      </div>
    </template>
  </UModal>
</template>
