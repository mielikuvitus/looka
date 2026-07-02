<script setup lang="ts">
import { initials } from '~/utils/format'

const props = defineProps<{ collapsed?: boolean }>()
const emit = defineEmits<{ toggle: [] }>()

const { user, isManager, signOut } = useAuth()

const items = computed(() => [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/dashboard' },
  { label: 'Board', icon: 'i-lucide-columns-3', to: '/board' },
  { label: 'Claims', icon: 'i-lucide-folder-open', to: '/claims' },
  // role-gated: handlers simply never see it (team API re-checks anyway)
  ...(isManager.value ? [{ label: 'Team', icon: 'i-lucide-users', to: '/team' }] : []),
])
</script>

<template>
  <aside class="flex h-full flex-col border-r border-zinc-200 bg-paper">
    <div
      class="flex h-16 shrink-0 items-center border-b border-zinc-200"
      :class="props.collapsed ? 'justify-center px-0' : 'justify-between px-4'"
    >
      <Logo v-if="!props.collapsed" to="/dashboard" />
      <button
        type="button"
        class="flex size-8 items-center justify-center text-zinc-500 hover:text-ink"
        :title="props.collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="emit('toggle')"
      >
        <UIcon :name="props.collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'" class="size-4.5" />
      </button>
    </div>

    <nav class="flex-1 overflow-y-auto py-3">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 border-l-2 border-transparent py-2.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-ink"
        :class="props.collapsed ? 'justify-center px-0' : 'px-4'"
        active-class="border-l-2 !border-ink bg-zinc-100 font-medium !text-ink"
        :title="props.collapsed ? item.label : undefined"
      >
        <UIcon :name="item.icon" class="size-4.5 shrink-0" />
        <span v-if="!props.collapsed">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div class="shrink-0 border-t border-zinc-200 p-3">
      <div class="flex items-center gap-2.5" :class="props.collapsed ? 'flex-col' : ''">
        <NuxtLink to="/profile" class="flex min-w-0 flex-1 items-center gap-2.5" :class="props.collapsed ? 'flex-none' : ''" :title="props.collapsed ? 'Profile' : undefined">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-[11px] text-paper">
            {{ initials(user?.name) }}
          </span>
          <span v-if="!props.collapsed" class="min-w-0">
            <span class="block truncate text-sm font-medium">{{ user?.name }}</span>
            <span class="stamp block text-zinc-500">{{ user?.role }}</span>
          </span>
        </NuxtLink>
        <button
          type="button"
          class="flex size-8 shrink-0 items-center justify-center text-zinc-400 hover:text-ink"
          title="Sign out"
          @click="signOut()"
        >
          <UIcon name="i-lucide-log-out" class="size-4" />
        </button>
      </div>
    </div>
  </aside>
</template>
