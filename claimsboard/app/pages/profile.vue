<script setup lang="ts">
import { initials } from '~/utils/format'

definePageMeta({ layout: 'app', middleware: 'auth', title: 'Profile' })
useHead({ title: 'Profile — Claimsboard' })

const { user, signOut } = useAuth()
</script>

<template>
  <div class="mx-auto max-w-lg px-4 py-10 md:px-6">
    <div class="border border-zinc-200 bg-paper">
      <div class="flex items-center gap-4 border-b border-zinc-200 p-6">
        <span class="flex size-14 items-center justify-center rounded-full bg-ink font-mono text-lg text-paper">
          {{ initials(user?.name) }}
        </span>
        <div class="min-w-0">
          <h2 class="truncate font-serif text-2xl font-semibold">{{ user?.name }}</h2>
          <p class="truncate text-sm text-zinc-500">{{ user?.email }}</p>
        </div>
      </div>
      <dl class="space-y-4 p-6">
        <div class="flex items-center justify-between">
          <dt class="stamp text-zinc-500">Role</dt>
          <dd><span class="stamp border border-ink px-2 py-0.5">{{ user?.role }}</span></dd>
        </div>
        <div class="flex items-center justify-between">
          <dt class="stamp text-zinc-500">Desk</dt>
          <dd class="text-sm">Claims — Looka insurance room</dd>
        </div>
      </dl>
      <div class="border-t border-zinc-200 p-6">
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-log-out"
          label="Sign out"
          @click="signOut()"
        />
      </div>
    </div>
  </div>
</template>
