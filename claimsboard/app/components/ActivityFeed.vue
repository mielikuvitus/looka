<script setup lang="ts">
import type { ActivityItem } from '~/utils/format'
import { EVENT_ICONS, eventText, timeAgo } from '~/utils/format'

withDefaults(defineProps<{
  items: ActivityItem[]
  /** Link each row to its claim (dashboard feed); off inside the claim file. */
  showClaim?: boolean
}>(), { showClaim: false })
</script>

<template>
  <ul v-if="items.length" class="divide-y divide-zinc-200">
    <li v-for="ev in items" :key="ev.id" class="flex items-start gap-3 py-2.5">
      <UIcon :name="EVENT_ICONS[ev.type] ?? 'i-lucide-dot'" class="mt-0.5 size-4 shrink-0 text-zinc-400" />
      <div class="min-w-0 flex-1 text-sm leading-snug">
        <span v-if="ev.actorName" class="font-medium">{{ ev.actorName }}</span>
        <span v-else class="text-zinc-500">System</span>
        {{ ' ' }}<span class="text-zinc-700">{{ eventText(ev) }}</span>
        <NuxtLink
          v-if="showClaim && ev.claimId"
          :to="`/claims/${ev.claimId}`"
          class="ml-1 font-mono text-[12px] text-zinc-500 underline-offset-2 hover:text-ink hover:underline"
        >
          #{{ ev.claimNo }}<template v-if="ev.customer"> · {{ ev.customer }}</template>
        </NuxtLink>
      </div>
      <span class="stamp shrink-0 pt-0.5 text-zinc-400">{{ timeAgo(ev.createdAt) }}</span>
    </li>
  </ul>
  <p v-else class="stamp py-6 text-center text-zinc-400">
    No activity yet
  </p>
</template>
