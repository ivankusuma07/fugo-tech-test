<script setup lang="ts">
const props = defineProps<{ briefId: string, initialDraft: string | null }>()
const { $api } = useNuxtApp()

const draft = ref(props.initialDraft)
const generating = ref(false)
const error = ref<string>()
const copied = ref(false)

async function generate() {
  generating.value = true
  error.value = undefined
  try {
    const res = await $api<{ emailDraft: string }>(`/api/admin/briefs/${props.briefId}/email-draft`, { method: 'POST' })
    draft.value = res.emailDraft
  }
  catch (e) {
    error.value = getApiErrorMessage(e, 'Gagal membuat draft email.')
  }
  finally {
    generating.value = false
  }
}

async function copy() {
  if (!draft.value) return
  await navigator.clipboard.writeText(draft.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <section
    aria-labelledby="draft-h"
    class="flex flex-col gap-3.5 rounded-2xl border border-line bg-white px-[22px] py-[18px]"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <h2
          id="draft-h"
          class="flex items-center gap-2 text-base font-semibold"
        >
          <AppIcon
            name="mail"
            :size="18"
            class="text-muted"
          />
          Draft email balasan
        </h2>
        <span class="rounded-full bg-brand-soft px-2 py-[3px] text-xs font-semibold text-brand-ink">Nilai tambah</span>
      </div>
      <div class="flex gap-2">
        <button
          v-if="draft"
          type="button"
          class="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-line-strong bg-white px-3.5 text-sm font-semibold"
          @click="copy"
        >
          <AppIcon :name="copied ? 'check' : 'copy'" />
          {{ copied ? 'Tersalin' : 'Salin' }}
        </button>
        <button
          type="button"
          :disabled="generating"
          class="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] bg-ink px-3.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
          @click="generate"
        >
          <AppIcon :name="generating ? 'spinner' : (draft ? 'refresh' : 'mail-plus')" />
          {{ draft ? 'Buat ulang' : 'Buat draft' }}
        </button>
      </div>
    </div>
    <p
      v-if="error"
      role="alert"
      class="text-sm font-medium text-danger"
    >
      {{ error }}
    </p>
    <div
      v-if="draft"
      class="rounded-xl border border-line-soft bg-subtle p-4 text-sm leading-relaxed whitespace-pre-line text-ink-2"
    >
      {{ draft }}
    </div>
    <p
      v-else-if="!error"
      class="text-sm text-muted"
    >
      Buat draft balasan untuk klien berdasarkan brief dan informasi yang masih kurang.
    </p>
  </section>
</template>
