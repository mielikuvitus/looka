<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  hint?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2 border border-dashed border-zinc-300 px-6 py-12 text-center">
    <UIcon v-if="icon" :name="icon" class="size-6 text-zinc-400" />
    <p class="font-serif text-lg">
      {{ title }}
    </p>
    <p v-if="hint" class="max-w-sm text-sm text-zinc-500">
      {{ hint }}
    </p>
    <div class="mt-2">
      <slot />
    </div>
  </div>
</template>
