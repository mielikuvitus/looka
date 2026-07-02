<script setup lang="ts">
import { initials } from '~/utils/format'

const emit = defineEmits<{ menu: [] }>()

const route = useRoute()
const { user } = useAuth()

// Pages set definePageMeta({ title: 'Board' }) — never hand-map route names.
const title = computed(() => (route.meta.title as string | undefined) ?? 'Claimsboard')

const q = ref('')
function search() {
  const query = q.value.trim()
  if (query)
    navigateTo({ path: '/claims', query: { q: query } })
  q.value = ''
}

const today = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
}).format(new Date())
</script>

<template>
  <header class="flex h-16 shrink-0 items-center gap-4 border-b border-zinc-200 bg-paper px-4 md:px-6">
    <button
      type="button"
      class="flex size-8 items-center justify-center text-zinc-600 md:hidden"
      aria-label="Open menu"
      @click="emit('menu')"
    >
      <UIcon name="i-lucide-menu" class="size-5" />
    </button>

    <h1 class="truncate font-serif text-xl font-semibold tracking-tight">
      {{ title }}
    </h1>

    <div class="flex-1" />

    <!-- Global search → /claims?q= ("Where's my claim?") -->
    <form class="hidden sm:block" @submit.prevent="search">
      <UInput
        v-model="q"
        icon="i-lucide-search"
        size="sm"
        variant="outline"
        placeholder="Find a claim — # or name"
        class="w-56"
      />
    </form>

    <span class="stamp hidden text-zinc-500 lg:inline">{{ today }}</span>

    <NuxtLink to="/profile" title="Profile" class="shrink-0">
      <span class="flex size-8 items-center justify-center rounded-full bg-ink font-mono text-[11px] text-paper">
        {{ initials(user?.name) }}
      </span>
    </NuxtLink>
  </header>
</template>
