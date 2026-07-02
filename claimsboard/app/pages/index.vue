<script setup lang="ts">
definePageMeta({ layout: 'marketing' })
useHead({ title: 'Claimsboard — the board, protected' })

const features = [
  {
    icon: 'i-lucide-columns-3',
    kicker: 'The board',
    title: 'Five columns, no mystery',
    body: 'New → In Review → Awaiting Docs → Approved → Paid. Drag a claim, the status changes, the history writes itself.',
  },
  {
    icon: 'i-lucide-folder-open',
    kicker: 'The claim file',
    title: 'A file, not a row',
    body: 'Photos, police reports, parties, money and every note in one place — the way a claim actually lives on a desk.',
  },
  {
    icon: 'i-lucide-layout-dashboard',
    kicker: 'The dashboard',
    title: 'Everyone sees the state of play',
    body: 'Open claims, past-SLA, paid this week, and who did what — one glance for the whole team, no status meeting.',
  },
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="border-b border-zinc-200 px-6 py-20 md:px-10 md:py-28">
      <div class="mx-auto max-w-4xl">
        <p class="stamp text-zinc-500">Shield · Board — claims management</p>
        <h1 class="mt-6 max-w-2xl font-serif text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          The board,<br>protected.
        </h1>
        <p class="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600">
          A claims desk that does one thing well: every claim visible, every
          document attached, every euro accounted for — from first notice of
          loss to paid.
        </p>
        <div class="mt-10 flex flex-wrap items-center gap-3">
          <UButton to="/auth" size="lg" color="primary" label="Open the board" trailing-icon="i-lucide-arrow-right" />
          <UButton to="/auth?mode=register" size="lg" variant="outline" color="neutral" label="Create an account" />
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="px-6 py-16 md:px-10">
      <div class="mx-auto grid max-w-5xl gap-px overflow-hidden border border-zinc-200 bg-zinc-200 md:grid-cols-3">
        <article v-for="f in features" :key="f.title" class="bg-paper p-8">
          <UIcon :name="f.icon" class="size-5 text-zinc-400" />
          <p class="stamp mt-5 text-zinc-500">{{ f.kicker }}</p>
          <h2 class="mt-2 font-serif text-xl font-semibold">{{ f.title }}</h2>
          <p class="mt-3 text-sm leading-relaxed text-zinc-600">{{ f.body }}</p>
        </article>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="border-t border-zinc-200 px-6 py-16 text-center md:px-10">
      <p class="stamp text-zinc-500">No demo data to imagine — it's already seeded</p>
      <h2 class="mx-auto mt-4 max-w-lg font-serif text-3xl font-semibold tracking-tight">
        Sign in as the team and work a claim to Paid.
      </h2>
      <div class="mt-8">
        <UButton to="/auth" size="lg" color="primary" label="Sign in" />
      </div>
    </section>
  </div>
</template>
