// Thin $fetch wrappers over /api/claims… so pages never hand-roll fetch calls.
// Success/error toasts included (gridfin convention); pass silent: true when a
// caller (e.g. optimistic board drag) handles feedback itself.

interface WriteOpts {
  silent?: boolean
}

export function useClaims() {
  const toast = useToast()

  function fail(title: string, e: unknown, opts?: WriteOpts): never {
    if (!opts?.silent) {
      const description = (e as { data?: { statusMessage?: string } })?.data?.statusMessage
        ?? (e instanceof Error ? e.message : undefined)
      toast.add({ title, description, icon: 'i-lucide-octagon-alert' })
    }
    throw e
  }

  return {
    list: () => $fetch('/api/claims'),

    get: (id: string) => $fetch(`/api/claims/${id}`),

    async create(body: Record<string, unknown>, opts?: WriteOpts) {
      try {
        const claim = await $fetch('/api/claims', { method: 'POST', body })
        if (!opts?.silent)
          toast.add({ title: `Claim #${claim.claimNo} opened`, icon: 'i-lucide-file-plus-2' })
        return claim
      }
      catch (e) {
        fail('Could not open claim', e, opts)
      }
    },

    async patch(id: string, body: Record<string, unknown>, opts?: WriteOpts) {
      try {
        return await $fetch(`/api/claims/${id}`, { method: 'PATCH', body })
      }
      catch (e) {
        fail('Could not update claim', e, opts)
      }
    },

    async remove(id: string, opts?: WriteOpts) {
      try {
        return await $fetch(`/api/claims/${id}`, { method: 'DELETE' })
      }
      catch (e) {
        fail('Could not delete claim', e, opts)
      }
    },

    async addNote(id: string, body: string, opts?: WriteOpts) {
      try {
        return await $fetch(`/api/claims/${id}/events`, { method: 'POST', body: { body } })
      }
      catch (e) {
        fail('Could not add note', e, opts)
      }
    },

    async addParty(id: string, body: Record<string, unknown>, opts?: WriteOpts) {
      try {
        return await $fetch(`/api/claims/${id}/parties`, { method: 'POST', body })
      }
      catch (e) {
        fail('Could not add party', e, opts)
      }
    },

    async patchParty(id: string, partyId: string, body: Record<string, unknown>, opts?: WriteOpts) {
      try {
        return await $fetch(`/api/claims/${id}/parties/${partyId}`, { method: 'PATCH', body })
      }
      catch (e) {
        fail('Could not update party', e, opts)
      }
    },

    async removeParty(id: string, partyId: string, opts?: WriteOpts) {
      try {
        return await $fetch(`/api/claims/${id}/parties/${partyId}`, { method: 'DELETE' })
      }
      catch (e) {
        fail('Could not remove party', e, opts)
      }
    },

    async uploadDocs(id: string, files: File[], type?: string, opts?: WriteOpts) {
      try {
        const form = new FormData()
        if (type)
          form.append('type', type)
        for (const f of files)
          form.append('files', f, f.name)
        const docs = await $fetch(`/api/claims/${id}/documents`, { method: 'POST', body: form })
        if (!opts?.silent)
          toast.add({ title: `${files.length === 1 ? files[0]!.name : `${files.length} files`} uploaded`, icon: 'i-lucide-paperclip' })
        return docs
      }
      catch (e) {
        fail('Upload failed', e, opts)
      }
    },

    async removeDoc(id: string, docId: string, opts?: WriteOpts) {
      try {
        return await $fetch(`/api/claims/${id}/documents/${docId}`, { method: 'DELETE' })
      }
      catch (e) {
        fail('Could not remove document', e, opts)
      }
    },
  }
}
