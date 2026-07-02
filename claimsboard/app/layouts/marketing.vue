<template>
  <div class="flex min-h-screen flex-col bg-paper text-ink">
    <header class="flex h-16 items-center justify-between border-b border-zinc-200 px-6 md:px-10">
      <Logo />
      <nav class="flex items-center gap-2">
        <UButton to="/auth" variant="ghost" color="neutral" label="Sign in" />
        <UButton to="/auth?mode=register" color="primary" label="Get started" />
      </nav>
    </header>

    <main class="flex flex-1 flex-col">
      <slot />
    </main>

    <footer class="flex items-center justify-between border-t border-zinc-200 px-6 py-6 md:px-10">
      <span class="stamp text-zinc-500">Claimsboard — the board, protected</span>
      <span class="stamp text-zinc-400">Looka · XRCC '26</span>
    </footer>
  </div>
</template>
