<script setup lang="ts">
// The parent owns the write; we await it so the pending spinner is real and the
// typed note survives a failed save.
const props = defineProps<{ onSubmit: (text: string) => Promise<void> }>()

const text = ref('')
const pending = ref(false)

async function submit() {
  const body = text.value.trim()
  if (!body || pending.value)
    return
  pending.value = true
  try {
    await props.onSubmit(body)
    text.value = '' // only clear once it actually saved
  }
  catch {
    // keep the text so the user can retry (parent already toasted)
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="border border-zinc-200 p-3" @submit.prevent="submit">
    <UTextarea
      v-model="text"
      :rows="2"
      autoresize
      placeholder="Add a note to the file — calls, decisions, next steps…"
      variant="none"
      class="w-full"
      @keydown.meta.enter="submit"
      @keydown.ctrl.enter="submit"
    />
    <div class="mt-2 flex items-center justify-between">
      <span class="stamp text-zinc-400">notes are part of the record</span>
      <UButton
        type="submit"
        color="primary"
        size="sm"
        label="Add note"
        :disabled="!text.trim()"
        :loading="pending"
      />
    </div>
  </form>
</template>
