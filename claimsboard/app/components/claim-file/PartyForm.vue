<script setup lang="ts">
import { PARTY_ROLE_LABELS } from '~/utils/format'

const emit = defineEmits<{
  submit: [payload: { role: string, name: string, contact?: string, org?: string }]
  cancel: []
}>()

const form = reactive({ role: 'insured', name: '', contact: '', org: '' })
const problem = ref('')

const roleOptions = Object.entries(PARTY_ROLE_LABELS).map(([value, label]) => ({ value, label }))

function submit() {
  problem.value = ''
  if (!form.name.trim()) {
    problem.value = 'A name is required.'
    return
  }
  emit('submit', {
    role: form.role,
    name: form.name.trim(),
    contact: form.contact.trim() || undefined,
    org: form.org.trim() || undefined,
  })
}
</script>

<template>
  <form class="border border-zinc-200 p-4" @submit.prevent="submit">
    <p class="stamp text-zinc-500">
      New party
    </p>
    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      <UFormField label="Role">
        <USelectMenu
          v-model="form.role"
          :items="roleOptions"
          value-key="value"
          label-key="label"
          :search-input="false"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Name" required>
        <UInput v-model="form.name" placeholder="G. Steinbach" class="w-full" />
      </UFormField>
      <UFormField label="Contact">
        <UInput v-model="form.contact" placeholder="phone or email" class="w-full" />
      </UFormField>
      <UFormField label="Organisation">
        <UInput v-model="form.org" placeholder="TÜV Rheinland Gutachten" class="w-full" />
      </UFormField>
    </div>

    <p v-if="problem" class="mt-3 border border-ink bg-zinc-100 px-3 py-2 text-sm">
      {{ problem }}
    </p>

    <div class="mt-4 flex items-center justify-end gap-2">
      <UButton variant="ghost" color="neutral" label="Cancel" @click="emit('cancel')" />
      <UButton type="submit" color="primary" label="Add to file" />
    </div>
  </form>
</template>
