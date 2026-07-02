<script setup lang="ts">
import type { ClaimDocRow, ClaimFile } from '~/types/claim'
import { DOC_TYPE_LABELS, formatDate } from '~/utils/format'

const props = defineProps<{ claim: ClaimFile }>()
const emit = defineEmits<{ changed: [] }>()

const photos = computed(() => props.claim.docs.filter(d => d.mimeType?.startsWith('image/')))
const files = computed(() => props.claim.docs.filter(d => !d.mimeType?.startsWith('image/')))

const { removeDoc } = useClaims()

async function remove(doc: ClaimDocRow) {
  // eslint-disable-next-line no-alert
  if (!window.confirm(`Remove ${doc.filename} from the file?`))
    return
  await removeDoc(props.claim.id, doc.id)
  emit('changed')
}

function kb(size: number | null): string {
  return size ? `${Math.max(1, Math.round(size / 1024))} KB` : '—'
}
</script>

<template>
  <div>
    <EmptyState
      v-if="!claim.docs.length"
      icon="i-lucide-file-plus-2"
      title="The file is empty"
      hint="Start with the FNOL — drop it below and the history will note it."
    />

    <template v-else>
      <!-- Photos first: evidence is what you open the file for -->
      <div v-if="photos.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <figure v-for="doc in photos" :key="doc.id" class="group relative border border-zinc-200">
          <a :href="doc.url" target="_blank" rel="noopener" class="block">
            <img :src="doc.url" :alt="doc.filename" class="aspect-[4/3] w-full object-cover" loading="lazy">
          </a>
          <figcaption class="stamp flex items-center justify-between gap-2 border-t border-zinc-200 px-2 py-1.5 text-zinc-500">
            <span class="truncate">{{ doc.filename }}</span>
            <button
              type="button"
              class="shrink-0 text-zinc-400 opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
              :title="`Remove ${doc.filename}`"
              @click.stop="remove(doc)"
            >
              <UIcon name="i-lucide-x" class="size-3.5" />
            </button>
          </figcaption>
        </figure>
      </div>

      <ul v-if="files.length" class="divide-y divide-zinc-200 border-y border-zinc-200" :class="photos.length ? 'mt-6' : ''">
        <li v-for="doc in files" :key="doc.id" class="flex items-center gap-3 py-2.5">
          <UIcon name="i-lucide-file-text" class="size-4 shrink-0 text-zinc-400" />
          <a :href="doc.url" target="_blank" rel="noopener" class="min-w-0 flex-1 truncate text-sm font-medium underline-offset-4 hover:underline">
            {{ doc.filename }}
          </a>
          <span class="stamp hidden text-zinc-500 sm:inline">{{ DOC_TYPE_LABELS[doc.type] ?? doc.type }}</span>
          <span class="hidden font-mono text-xs text-zinc-400 md:inline">{{ kb(doc.sizeBytes) }}</span>
          <span class="stamp hidden text-zinc-400 sm:inline">{{ formatDate(doc.uploadedAt) }}</span>
          <button
            type="button"
            class="shrink-0 text-zinc-400 hover:text-ink"
            :title="`Remove ${doc.filename}`"
            @click="remove(doc)"
          >
            <UIcon name="i-lucide-x" class="size-4" />
          </button>
        </li>
      </ul>
    </template>

    <UploadDropzone class="mt-6" :claim-id="claim.id" @uploaded="emit('changed')" />
  </div>
</template>
