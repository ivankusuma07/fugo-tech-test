<script setup lang="ts">
import { PIPELINE_LABELS, type PipelineStatus } from '#shared/constants'

export interface HistoryEntry {
  id: string
  fromStatus: PipelineStatus | null
  toStatus: PipelineStatus
  changedByEmail: string | null
  createdAt: string
}

/** Entries are newest first. */
const props = defineProps<{ entries: HistoryEntry[] }>()

const changeCount = computed(() => props.entries.filter(e => e.fromStatus !== null).length)

function tone(status: PipelineStatus) {
  if (status === 'won') return { text: 'text-ok', bg: 'bg-ok-soft', border: 'border-ok', dot: 'bg-ok' }
  if (status === 'lost') return { text: 'text-danger', bg: 'bg-danger-soft', border: 'border-danger', dot: 'bg-danger' }
  return { text: 'text-brand-ink', bg: 'bg-brand-soft', border: 'border-brand-ink', dot: 'bg-brand-ink' }
}
</script>

<template>
  <section
    aria-labelledby="hist-h"
    class="flex flex-col gap-3.5 rounded-2xl border border-line bg-white px-[22px] py-[18px]"
  >
    <div class="flex items-center justify-between gap-3">
      <h2
        id="hist-h"
        class="flex items-center gap-2 text-base font-semibold"
      >
        <AppIcon
          name="history"
          :size="18"
          class="text-muted"
        />
        Riwayat status pipeline
      </h2>
      <span class="text-[13px] text-muted">{{ changeCount }} perubahan</span>
    </div>
    <ol class="flex flex-col">
      <li
        v-for="(h, i) in entries"
        :key="h.id"
        class="flex items-stretch gap-3"
      >
        <div
          aria-hidden="true"
          class="flex w-3 flex-none flex-col items-center"
        >
          <span
            class="mt-[5px] size-2.5 flex-none rounded-full border-2"
            :class="[tone(h.toStatus).border, i === 0 ? tone(h.toStatus).dot : 'bg-white']"
          />
          <span
            v-if="i < entries.length - 1"
            class="mt-1 w-0.5 flex-1 bg-line-soft"
          />
        </div>
        <div class="flex min-w-0 flex-col gap-1 pb-4">
          <span
            v-if="h.fromStatus === null"
            class="text-sm font-semibold"
          >
            Brief masuk sebagai
            <span
              class="inline-flex h-[22px] items-center rounded-md px-2 text-xs font-semibold"
              :class="[tone(h.toStatus).bg, tone(h.toStatus).text]"
            >
              {{ PIPELINE_LABELS[h.toStatus] }}
            </span>
          </span>
          <span
            v-else
            class="flex flex-wrap items-center gap-1.5 text-sm font-semibold"
          >
            <span class="inline-flex h-[22px] items-center rounded-md border border-line px-2 text-xs font-medium text-muted">
              {{ PIPELINE_LABELS[h.fromStatus] }}
            </span>
            <AppIcon
              name="arrow-right"
              :size="14"
              class="text-muted"
            />
            <span class="sr-only">menjadi</span>
            <span
              class="inline-flex h-[22px] items-center rounded-md px-2 text-xs font-semibold"
              :class="[tone(h.toStatus).bg, tone(h.toStatus).text]"
            >
              {{ PIPELINE_LABELS[h.toStatus] }}
            </span>
          </span>
          <span class="text-[13px] text-muted">
            oleh {{ h.changedByEmail ?? 'Sistem' }} · {{ formatDateTime(h.createdAt) }} WIB
          </span>
        </div>
      </li>
    </ol>
  </section>
</template>
