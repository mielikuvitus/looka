<script setup lang="ts">
import type { BoardClaim } from '~/components/board/ClaimCard.vue'
import type { Status } from '~/utils/format'
import { VueDraggable } from 'vue-draggable-plus'

defineProps<{
  status: Status
  label: string
}>()

const emit = defineEmits<{ drop: [] }>()

// The page owns the arrays; Sortable mutates them through this model.
const model = defineModel<BoardClaim[]>({ required: true })
</script>

<template>
  <section class="flex w-64 shrink-0 flex-col xl:w-auto xl:min-w-0 xl:flex-1">
    <header class="stamp flex items-baseline justify-between border-t-2 border-ink pt-2 text-zinc-600">
      <span class="text-ink">{{ label }}</span>
      <span class="text-zinc-400">{{ model.length }}</span>
    </header>

    <VueDraggable
      v-model="model"
      group="claims"
      :animation="150"
      ghost-class="opacity-40"
      class="mt-3 min-h-24 flex-1 space-y-2"
      @add="emit('drop')"
    >
      <ClaimCard v-for="claim in model" :key="claim.id" :claim="claim" />
    </VueDraggable>
  </section>
</template>
