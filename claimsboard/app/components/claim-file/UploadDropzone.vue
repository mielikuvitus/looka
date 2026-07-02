<script setup lang="ts">
import { DOC_TYPE_LABELS } from '~/utils/format'

const props = defineProps<{ claimId: string }>()
const emit = defineEmits<{ uploaded: [] }>()

const input = ref<HTMLInputElement>()
const over = ref(false)
const uploading = ref(false)
const docType = ref('')

const typeOptions = [
  { value: '', label: 'Detect from file' },
  ...Object.entries(DOC_TYPE_LABELS).map(([value, label]) => ({ value, label })),
]

const { uploadDocs } = useClaims()

async function handle(files: FileList | null) {
  if (!files?.length || uploading.value)
    return
  uploading.value = true
  try {
    await uploadDocs(props.claimId, Array.from(files), docType.value || undefined)
    emit('uploaded')
  }
  catch {
    // useClaims already toasted
  }
  finally {
    uploading.value = false
    if (input.value)
      input.value.value = ''
  }
}

function onDrop(e: DragEvent) {
  over.value = false
  handle(e.dataTransfer?.files ?? null)
}
</script>

<template>
  <div>
    <button
      type="button"
      class="flex w-full flex-col items-center gap-2 border border-dashed px-6 py-8 text-center transition-colors"
      :class="over ? 'border-ink bg-zinc-100' : 'border-zinc-300 hover:border-zinc-500'"
      :disabled="uploading"
      @click="input?.click()"
      @dragover.prevent="over = true"
      @dragleave="over = false"
      @drop.prevent="onDrop"
    >
      <UIcon :name="uploading ? 'i-lucide-loader-circle' : 'i-lucide-upload'" class="size-5 text-zinc-400" :class="uploading ? 'animate-spin' : ''" />
      <span class="text-sm text-zinc-600">
        {{ uploading ? 'Uploading…' : 'Drop files here, or click to browse' }}
      </span>
      <span class="stamp text-zinc-400">photos · pdf · anything the file needs</span>
    </button>

    <div class="mt-2 flex items-center justify-end gap-2">
      <span class="stamp text-zinc-400">file as</span>
      <USelectMenu
        v-model="docType"
        :items="typeOptions"
        value-key="value"
        label-key="label"
        :search-input="false"
        size="xs"
        class="w-44"
      />
    </div>

    <input
      ref="input"
      type="file"
      multiple
      class="hidden"
      @change="handle(($event.target as HTMLInputElement).files)"
    >
  </div>
</template>
