<script setup lang="ts">
definePageMeta({ layout: 'marketing' })
useHead({ title: 'Sign in — Claimsboard' })

const route = useRoute()
const { isAuthenticated, signIn, signUp } = useAuth()

const mode = ref<'signin' | 'register'>(route.query.mode === 'register' ? 'register' : 'signin')
const form = reactive({ name: '', email: '', password: '' })
const pending = ref(false)
const errorMsg = ref('')

const next = computed(() =>
  typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/dashboard',
)

// Already signed in? Straight through.
onMounted(() => {
  if (isAuthenticated.value)
    navigateTo(next.value, { replace: true })
})

// Seeded team — click to prefill (shared dev password).
const seeded = [
  { name: 'Mara', email: 'mara@claimsboard.test', role: 'manager' },
  { name: 'Jana', email: 'jana@claimsboard.test', role: 'handler' },
  { name: 'Sami', email: 'sami@claimsboard.test', role: 'handler' },
]
function prefill(email: string) {
  mode.value = 'signin'
  form.email = email
  form.password = 'claimsboard-dev'
}

async function submit() {
  errorMsg.value = ''
  pending.value = true
  try {
    if (mode.value === 'register')
      await signUp(form.name, form.email, form.password)
    else
      await signIn(form.email, form.password)
    await navigateTo(next.value, { replace: true })
  }
  catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'That did not work — check the details.'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="flex flex-1 items-start justify-center px-6 py-16 md:py-24">
    <div class="w-full max-w-sm">
      <p class="stamp text-zinc-500">
        {{ mode === 'signin' ? 'Welcome back' : 'New here' }}
      </p>
      <h1 class="mt-2 font-serif text-3xl font-semibold tracking-tight">
        {{ mode === 'signin' ? 'Open the board.' : 'Join the desk.' }}
      </h1>

      <form class="mt-8 space-y-4" @submit.prevent="submit">
        <UFormField v-if="mode === 'register'" label="Name" name="name">
          <UInput v-model="form.name" placeholder="Your name" autocomplete="name" required class="w-full" />
        </UFormField>
        <UFormField label="Email" name="email">
          <UInput v-model="form.email" type="email" placeholder="you@claimsboard.test" autocomplete="email" required class="w-full" />
        </UFormField>
        <UFormField label="Password" name="password">
          <UInput v-model="form.password" type="password" placeholder="••••••••" :autocomplete="mode === 'register' ? 'new-password' : 'current-password'" required class="w-full" />
        </UFormField>

        <p v-if="errorMsg" class="border border-ink bg-zinc-100 px-3 py-2 text-sm">
          {{ errorMsg }}
        </p>

        <UButton
          type="submit"
          color="primary"
          block
          size="lg"
          :loading="pending"
          :label="mode === 'signin' ? 'Sign in' : 'Create account'"
        />
      </form>

      <button
        type="button"
        class="mt-4 text-sm text-zinc-500 underline-offset-4 hover:text-ink hover:underline"
        @click="mode = mode === 'signin' ? 'register' : 'signin'"
      >
        {{ mode === 'signin' ? 'No account? Register instead' : 'Have an account? Sign in' }}
      </button>

      <!-- Seeded users hint -->
      <div class="mt-10 border border-dashed border-zinc-300 p-4">
        <p class="stamp text-zinc-500">Seeded team — click to prefill</p>
        <ul class="mt-3 space-y-1.5">
          <li v-for="u in seeded" :key="u.email">
            <button
              type="button"
              class="flex w-full items-baseline justify-between gap-2 text-left text-sm hover:text-ink"
              @click="prefill(u.email)"
            >
              <span class="truncate font-mono text-[13px] text-zinc-600 underline-offset-4 hover:underline">{{ u.email }}</span>
              <span class="stamp shrink-0 text-zinc-400">{{ u.role }}</span>
            </button>
          </li>
        </ul>
        <p class="mt-3 text-xs text-zinc-400">
          Password: <span class="font-mono">claimsboard-dev</span>
        </p>
      </div>
    </div>
  </div>
</template>
