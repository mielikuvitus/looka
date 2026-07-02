<script setup lang="ts">
// Filter row above the claims registry. Pure v-model bindings — the page owns
// the state (and keeps it in sync with the URL).
import { LINE_LABELS, STATUS_LABELS, STATUS_ORDER, SUB_STATUS_LABELS } from '~/utils/format'

const q = defineModel<string>('q', { default: '' })
const status = defineModel<string>('status', { default: '' })
const line = defineModel<string>('line', { default: '' })
const subStatus = defineModel<string>('subStatus', { default: '' })

const statusItems = [
  { label: 'All statuses', value: '' },
  ...STATUS_ORDER.map(s => ({ label: STATUS_LABELS[s] ?? s, value: s as string })),
]

const lineItems = [
  { label: 'All lines', value: '' },
  ...Object.entries(LINE_LABELS).map(([value, label]) => ({ label, value })),
]

const subStatusItems = [
  { label: 'All sub-statuses', value: '' },
  ...Object.entries(SUB_STATUS_LABELS).map(([value, label]) => ({ label, value })),
]

const active = computed(() =>
  !!(q.value || status.value || line.value || subStatus.value))

function clear() {
  q.value = ''
  status.value = ''
  line.value = ''
  subStatus.value = ''
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <UInput
      v-model="q"
      icon="i-lucide-search"
      size="sm"
      variant="outline"
      placeholder="Filter — # or customer"
      class="w-full sm:w-52"
    />

    <USelectMenu
      v-model="status"
      :items="statusItems"
      value-key="value"
      :search-input="false"
      size="sm"
      variant="outline"
      class="w-40"
      aria-label="Filter by status"
    />

    <USelectMenu
      v-model="line"
      :items="lineItems"
      value-key="value"
      :search-input="false"
      size="sm"
      variant="outline"
      class="w-36"
      aria-label="Filter by line"
    />

    <USelectMenu
      v-model="subStatus"
      :items="subStatusItems"
      value-key="value"
      :search-input="false"
      size="sm"
      variant="outline"
      class="w-44"
      aria-label="Filter by sub-status"
    />

    <UButton
      v-if="active"
      label="Clear"
      icon="i-lucide-x"
      variant="ghost"
      color="neutral"
      size="sm"
      @click="clear"
    />
  </div>
</template>
