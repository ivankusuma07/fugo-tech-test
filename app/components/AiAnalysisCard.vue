<script setup lang="ts">
import type { AiStatus } from '#shared/constants'
import type { AiResult } from '#shared/schemas/ai-result'

const props = defineProps<{
  aiStatus: AiStatus
  aiResult: AiResult | null
  aiError: string | null
  aiAttempts: number
  aiProcessedAt: string | null
  model: string | null
  reprocessing: boolean
}>()
const emit = defineEmits<{ reprocess: [] }>()

const priorityColor = { High: 'text-danger', Medium: 'text-warn', Low: 'text-neutral-ink' } as const
const meta = computed(() => {
  const parts = [`${props.aiAttempts} percobaan`]
  if (props.aiProcessedAt) parts.push(`terakhir ${formatDateTime(props.aiProcessedAt)} WIB`)
  return parts.join(' · ')
})
</script>

<template>
  <Transition
    name="fade-swap"
    mode="out-in"
  >
    <!-- Waiting or running -->
    <section
      v-if="aiStatus === 'pending' || aiStatus === 'processing'"
      key="running"
      aria-live="polite"
      class="flex flex-col gap-[18px] rounded-2xl border border-[#C9CFF7] bg-white p-[22px]"
    >
      <div class="flex items-center gap-3">
        <AppIcon
          name="spinner"
          :size="22"
          :stroke-width="2.5"
          class="text-brand"
        />
        <div class="flex flex-col gap-0.5">
          <h2 class="text-base font-semibold">
            {{ aiStatus === 'pending' ? 'Menunggu antrean AI…' : 'Sedang dianalisis AI…' }}
          </h2>
          <span class="text-[13px] text-muted">Halaman diperbarui otomatis saat hasil siap.</span>
        </div>
      </div>
      <div
        aria-hidden="true"
        class="flex flex-col gap-2.5"
      >
        <div class="h-3.5 w-[92%] animate-pulse rounded-md bg-line-soft" />
        <div class="h-3.5 w-[78%] animate-pulse rounded-md bg-line-soft" />
        <div class="h-3.5 w-[54%] animate-pulse rounded-md bg-line-soft" />
      </div>
    </section>

    <!-- Failed -->
    <section
      v-else-if="aiStatus === 'failed'"
      key="failed"
      aria-labelledby="fail-h"
      class="overflow-hidden rounded-2xl border border-[#F2B8B0] bg-white"
    >
      <div class="flex items-start gap-4 bg-danger-tint p-[22px]">
        <div class="flex size-10 flex-none items-center justify-center rounded-[10px] bg-[#FEE4E1] text-danger">
          <AppIcon
            name="alert-triangle"
            :size="20"
          />
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2
            id="fail-h"
            class="text-[17px] font-semibold text-danger-ink"
          >
            Analisis AI gagal
          </h2>
          <p class="text-[15px] leading-normal text-ink-2">
            Brief tetap tersimpan dengan aman. Hasil AI tidak dipakai karena prosesnya gagal. Coba proses ulang.
          </p>
        </div>
      </div>
      <div class="flex flex-col gap-3.5 px-[22px] py-[18px]">
        <div class="flex flex-col gap-1.5">
          <SectionLabel>Pesan error</SectionLabel>
          <code class="block rounded-[10px] bg-ink px-3.5 py-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-[#F1F1F3]">{{ aiError ?? 'Tidak ada detail error.' }}</code>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="text-[13px] text-muted">{{ meta }}</span>
          <button
            type="button"
            :disabled="reprocessing"
            class="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[10px] bg-ink transition hover:-translate-y-0.5 hover:bg-brand active:translate-y-0 active:scale-[0.98] px-[18px] text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
            @click="emit('reprocess')"
          >
            <AppIcon :name="reprocessing ? 'spinner' : 'refresh'" />
            Proses ulang AI
          </button>
        </div>
      </div>
    </section>

    <!-- Completed -->
    <section
      v-else
      key="done"
      aria-labelledby="ai-h"
      class="overflow-hidden rounded-2xl border border-line bg-white"
    >
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-[22px] py-[18px]">
        <div class="flex items-center gap-2.5">
          <div class="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <AppIcon
              name="sparkle"
              :size="18"
            />
          </div>
          <h2
            id="ai-h"
            class="text-base font-semibold"
          >
            Analisis AI
          </h2>
          <AiStatusBadge status="completed" />
        </div>
        <button
          type="button"
          :disabled="reprocessing"
          class="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-line-strong bg-white px-3.5 text-sm font-semibold transition hover:border-ink active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
          @click="emit('reprocess')"
        >
          <AppIcon :name="reprocessing ? 'spinner' : 'refresh'" />
          Proses ulang AI
        </button>
      </div>
      <div
        v-if="aiResult"
        class="flex flex-col gap-[22px] p-[22px]"
      >
        <div class="flex flex-col gap-1.5">
          <SectionLabel>Ringkasan</SectionLabel>
          <p class="text-[17px] leading-normal">
            {{ aiResult.summary }}
          </p>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5 rounded-xl border border-line-soft bg-subtle px-4 py-3.5">
            <SectionLabel>Kategori layanan</SectionLabel>
            <span class="text-base font-semibold">{{ aiResult.service_category }}</span>
          </div>
          <div class="flex flex-col gap-1.5 rounded-xl border border-line-soft bg-subtle px-4 py-3.5">
            <SectionLabel>Prioritas</SectionLabel>
            <span
              class="text-base font-semibold"
              :class="priorityColor[aiResult.priority]"
            >{{ aiResult.priority }}</span>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <SectionLabel>Alasan prioritas</SectionLabel>
          <p class="text-[15px] leading-normal text-ink-2">
            {{ aiResult.priority_reason }}
          </p>
        </div>
        <div class="flex flex-col gap-2.5">
          <SectionLabel>Informasi yang masih kurang</SectionLabel>
          <ul
            v-if="aiResult.missing_info.length"
            class="flex flex-col gap-2"
          >
            <li
              v-for="(item, i) in aiResult.missing_info"
              :key="item"
              class="anim-rise flex items-start gap-2.5 text-[15px] leading-snug"
              :style="{ '--delay': `${200 + i * 60}ms` }"
            >
              <AppIcon
                name="alert-circle"
                :size="18"
                class="mt-px flex-none text-warn"
              />
              {{ item }}
            </li>
          </ul>
          <p
            v-else
            class="text-[15px] text-muted"
          >
            Tidak ada, brief sudah cukup lengkap.
          </p>
        </div>
        <div class="flex flex-wrap justify-between gap-3 border-t border-line-soft pt-3.5 text-[13px] text-muted">
          <span>Model: {{ model ?? '—' }}</span>
          <span>{{ meta }}</span>
        </div>
      </div>
    </section>
  </Transition>
</template>
