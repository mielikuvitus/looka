<script setup lang="ts">
import type { ClaimFile } from '~/types/claim'

const props = defineProps<{ claim: ClaimFile }>()
const emit = defineEmits<{ changed: [] }>()

const { addNote } = useClaims()

// Returned promise is awaited by NoteComposer; addNote rethrows on failure so
// the composer keeps the note. 'changed' only fires once the note is saved.
async function onNote(text: string) {
  await addNote(props.claim.id, text)
  emit('changed')
}
</script>

<template>
  <div class="max-w-2xl">
    <NoteComposer :on-submit="onNote" />
    <ActivityFeed class="mt-6" :items="claim.events" />
  </div>
</template>
