<script setup lang="ts">
import { PIPELINE_TRANSITIONS, type PipelineStatus } from '#shared/constants'

definePageMeta({ layout: 'admin' })

const { $api } = useNuxtApp()
const route = useRoute()
const id = route.params.id as string

const { data, error, refresh } = await useFetch(`/api/admin/briefs/${id}`, { $fetch: $api })
const brief = computed(() => data.value?.brief)

useHead({ title: () => `${brief.value?.companyName ?? 'Detail brief'} — Brief Inbox` })

// Poll while the AI is still working on this brief.
const aiRunning = computed(() => brief.value?.aiStatus === 'pending' || brief.value?.aiStatus === 'processing')
usePolling(aiRunning, refresh, 2500)

const lastModel = computed(() => data.value?.aiRuns.find(r => r.status === 'success')?.model ?? null)

// Pipeline status
const statusBusy = ref(false)
const statusError = ref<string>()
const pipelineHint = computed(() => {
  if (statusError.value) return statusError.value
  if (!brief.value) return ''
  return PIPELINE_TRANSITIONS[brief.value.pipelineStatus].length === 0
    ? 'Status final. Brief ini sudah selesai diproses.'
    : 'Maju satu langkah. Tersimpan otomatis.'
})

async function changeStatus(to: PipelineStatus) {
  statusBusy.value = true
  statusError.value = undefined
  try {
    await $api(`/api/admin/briefs/${id}/status`, { method: 'PATCH', body: { pipelineStatus: to } })
    await refresh()
  }
  catch (e) {
    statusError.value = getApiErrorMessage(e, 'Gagal mengubah status.')
    await refresh() // someone else may have changed it; show the real state
  }
  finally {
    statusBusy.value = false
  }
}

// Reprocess AI
const reprocessing = ref(false)
const reprocessError = ref<string>()

async function reprocess() {
  reprocessing.value = true
  reprocessError.value = undefined
  try {
    await $api(`/api/admin/briefs/${id}/reprocess`, { method: 'POST' })
    await refresh()
  }
  catch (e) {
    reprocessError.value = getApiErrorMessage(e, 'Gagal memproses ulang.')
  }
  finally {
    reprocessing.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <NuxtLink
      to="/admin"
      class="inline-flex h-8 items-center gap-1.5 self-start text-sm text-muted hover:text-ink"
    >
      <AppIcon name="chevron-left" />
      Kembali ke daftar
    </NuxtLink>

    <div
      v-if="error"
      role="alert"
      class="rounded-2xl border border-line bg-white px-6 py-12 text-center"
    >
      <p class="text-[15px] font-semibold">
        {{ getApiStatus(error) === 404 ? 'Brief tidak ditemukan' : 'Gagal memuat brief' }}
      </p>
      <p class="mt-1 text-sm text-muted">
        {{ getApiErrorMessage(error) }}
      </p>
    </div>

    <template v-else-if="brief">
      <header class="flex flex-col gap-2.5">
        <div class="flex flex-wrap gap-2">
          <PriorityBadge
            :priority="brief.priority"
            placeholder="Prioritas —"
          />
          <span class="inline-flex h-[26px] items-center gap-1 rounded-full border border-line-strong px-2.5 text-[13px] font-medium">
            <AppIcon
              name="tag"
              :size="13"
            />
            {{ brief.serviceCategory ?? 'Kategori —' }}
          </span>
        </div>
        <h1 class="font-display text-[28px] font-bold tracking-[-0.02em] sm:text-[34px]">
          {{ brief.companyName }}
        </h1>
        <span class="flex items-center gap-1.5 text-sm text-muted">
          <AppIcon
            name="calendar-clock"
            :size="15"
          />
          {{ formatBriefNumber(brief.number) }} · Masuk {{ formatDateTime(brief.createdAt) }} WIB
        </span>
      </header>

      <section
        aria-labelledby="pipe-h"
        class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white px-5 py-[18px]"
      >
        <div class="flex flex-col gap-0.5">
          <h2
            id="pipe-h"
            class="flex items-center gap-2 text-[15px] font-semibold"
          >
            <AppIcon
              name="workflow"
              :size="18"
              class="text-muted"
            />
            Status pipeline
          </h2>
          <span
            class="text-[13px]"
            :class="statusError ? 'font-medium text-danger' : 'text-muted'"
            :role="statusError ? 'alert' : undefined"
          >{{ pipelineHint }}</span>
        </div>
        <PipelineStepper
          :status="brief.pipelineStatus"
          :busy="statusBusy"
          @change="changeStatus"
        />
      </section>

      <div class="flex flex-wrap items-start gap-6">
        <div class="flex min-w-0 flex-[3_1_480px] flex-col gap-6">
          <p
            v-if="reprocessError"
            role="alert"
            class="rounded-[10px] border border-[#F7C9C3] bg-danger-soft px-3.5 py-3 text-sm text-danger-ink"
          >
            {{ reprocessError }}
          </p>
          <AiAnalysisCard
            :ai-status="brief.aiStatus"
            :ai-result="brief.aiResult"
            :ai-error="brief.aiError"
            :ai-attempts="brief.aiAttempts"
            :ai-processed-at="brief.aiProcessedAt"
            :model="lastModel"
            :reprocessing="reprocessing"
            @reprocess="reprocess"
          />
          <EmailDraftCard
            v-if="brief.aiStatus === 'completed'"
            :brief-id="brief.id"
            :initial-draft="brief.emailDraft"
          />
        </div>

        <aside class="flex min-w-0 flex-[2_1_320px] flex-col gap-6">
          <BriefFormData
            :name="brief.name"
            :email="brief.email"
            :company-name="brief.companyName"
            :budget-range="brief.budgetRange"
            :target-date="brief.targetDate"
            :needs="brief.needs"
          />
          <PipelineHistory :entries="data!.history" />
          <AiRunsList :runs="data!.aiRuns" />
        </aside>
      </div>
    </template>
  </div>
</template>
