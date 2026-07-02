<script setup lang="ts">
// Authenticated shell: collapsible sidebar + header + scrollable main.
// Sidebar state survives navigation (useState), gridfin's showChrome shape.
const expanded = useState('cb-sidebar', () => true)
const mobileOpen = ref(false)

const route = useRoute()
watch(() => route.fullPath, () => {
  mobileOpen.value = false
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-paper text-ink">
    <div
      class="hidden shrink-0 transition-[width] duration-200 md:block"
      :class="expanded ? 'w-60' : 'w-16'"
    >
      <AppSidebar :collapsed="!expanded" @toggle="expanded = !expanded" />
    </div>

    <!-- mobile drawer -->
    <div v-if="mobileOpen" class="fixed inset-0 z-40 md:hidden">
      <div class="absolute inset-0 bg-ink/40" @click="mobileOpen = false" />
      <div class="absolute inset-y-0 left-0 w-64 shadow-xl">
        <AppSidebar @toggle="mobileOpen = false" />
      </div>
    </div>

    <div class="flex min-w-0 flex-1 flex-col">
      <AppHeader @menu="mobileOpen = true" />
      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
