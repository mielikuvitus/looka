<script setup lang="ts">
// Shield · Board — the board, protected. Same mark as public/icon.svg.
withDefaults(defineProps<{
  markOnly?: boolean
  to?: string
}>(), { to: '/' })
</script>

<template>
  <NuxtLink :to="to" class="flex items-center gap-2.5" aria-label="Claimsboard">
    <svg viewBox="23 24 54 60" class="h-7 w-auto shrink-0" aria-hidden="true">
      <path d="M27 28 H73 V52 Q73 70 50 80 Q27 70 27 52 Z" fill="#16150F" />
      <rect x="36" y="44" width="8" height="16" rx="2" fill="#FAF9F6" />
      <rect x="46" y="44" width="8" height="16" rx="2" fill="#FAF9F6" />
      <rect x="56" y="44" width="8" height="16" rx="2" fill="#FAF9F6" />
    </svg>
    <span v-if="!markOnly" class="font-serif text-lg font-semibold tracking-tight">Claimsboard</span>
  </NuxtLink>
</template>
