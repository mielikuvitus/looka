<script setup lang="ts">
// One cell of the KPI hairline grid. The parent supplies the gap-px wrapper
// (border + bg-zinc-200); this cell paints its own paper — or ink, for the
// page's single alarm surface.
withDefaults(defineProps<{
  label: string
  /** Pre-formatted display value (count or formatCents output). */
  value: string
  hint?: string
  /** bg-ink text-paper alarm treatment — at most one per page. */
  inverted?: boolean
}>(), { inverted: false })
</script>

<template>
  <div class="flex flex-col gap-1.5 p-5" :class="inverted ? 'bg-ink text-paper' : 'bg-paper'">
    <p class="stamp" :class="inverted ? 'text-paper/60' : 'text-zinc-500'">
      {{ label }}
    </p>
    <p class="font-serif text-3xl leading-none font-semibold md:text-4xl">
      {{ value }}
    </p>
    <p v-if="hint" class="text-xs" :class="inverted ? 'text-paper/50' : 'text-zinc-400'">
      {{ hint }}
    </p>
  </div>
</template>
