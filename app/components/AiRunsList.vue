<script setup lang="ts">
export interface AiRunEntry {
  id: string
  status: 'success' | 'failed'
  error: string | null
  latencyMs: number
  createdAt: string
}

/** Runs are newest first. */
defineProps<{ runs: AiRunEntry[] }>()

/** Short, human label for why a run failed. Full message is on the AI card. */
function failureLabel(error: string | null): string {
  if (!error) return 'error'
  if (error.includes('timeout')) return 'timeout'
  if (error.includes('validasi schema')) return 'output tidak valid'
  if (error.includes('bukan JSON')) return 'output bukan JSON'
  if (error.includes('LLM_API_KEY')) return 'API key belum diset'
  return 'error API'
}
</script>

<template>
  <section
    aria-labelledby="runs-h"
    class="flex flex-col gap-3.5 rounded-2xl border border-line bg-white px-[22px] py-[18px]"
  >
    <h2
      id="runs-h"
      class="text-base font-semibold"
    >
      Riwayat proses AI
    </h2>
    <p
      v-if="runs.length === 0"
      class="text-sm text-muted"
    >
      Belum ada percobaan.
    </p>
    <ol
      v-else
      class="flex flex-col gap-3"
    >
      <li
        v-for="r in runs"
        :key="r.id"
        class="flex items-start gap-3"
      >
        <span
          aria-hidden="true"
          class="mt-1.5 size-2 flex-none rounded-full"
          :class="r.status === 'success' ? 'bg-ok-dot' : 'bg-danger-dot'"
        />
        <div class="flex flex-col gap-0.5 text-sm">
          <span class="font-semibold">
            {{ r.status === 'success' ? 'Berhasil' : `Gagal · ${failureLabel(r.error)}` }} · {{ formatLatency(r.latencyMs) }}
          </span>
          <span class="text-[13px] text-muted">{{ formatDateTime(r.createdAt) }} WIB</span>
        </div>
      </li>
    </ol>
  </section>
</template>
