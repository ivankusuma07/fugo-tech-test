<script setup lang="ts">
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  PIPELINE_LABELS,
  PIPELINE_STATUSES,
  PRIORITIES,
  SERVICE_CATEGORIES,
  type PageSizeOption,
  type PipelineStatus,
  type Priority,
  type ServiceCategory,
} from '#shared/constants'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Brief masuk — Brief Inbox' })

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()

// Filters live in the URL, so a filtered view can be refreshed or shared.
function pickFromQuery<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined
}

const priority = computed({
  get: () => pickFromQuery<Priority>(route.query.priority, PRIORITIES),
  set: v => updateQuery({ priority: v, page: undefined }),
})
const category = computed({
  get: () => pickFromQuery<ServiceCategory>(route.query.category, SERVICE_CATEGORIES),
  set: v => updateQuery({ category: v, page: undefined }),
})
const pipeline = computed({
  get: () => pickFromQuery<PipelineStatus>(route.query.pipeline, PIPELINE_STATUSES),
  set: v => updateQuery({ pipeline: v, page: undefined }),
})
const perPage = computed({
  get: () => pickFromQuery<PageSizeOption>(route.query.perPage, PAGE_SIZE_OPTIONS) ?? DEFAULT_PAGE_SIZE,
  set: v => updateQuery({ perPage: v === DEFAULT_PAGE_SIZE ? undefined : v, page: undefined }),
})
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

function updateQuery(patch: Record<string, string | number | undefined>) {
  router.replace({ query: { ...route.query, ...patch } })
}

const { data, error, refresh, status } = await useFetch('/api/admin/briefs', {
  query: { priority, category, pipeline, page, pageSize: perPage },
  $fetch: $api,
})

const stats = computed(() => [
  { label: 'Total brief', value: data.value?.stats.total ?? 0, danger: false, icon: 'inbox' as const },
  { label: 'Prioritas High', value: data.value?.stats.high ?? 0, danger: true, icon: 'flame' as const },
  { label: 'Belum dihubungi', value: data.value?.stats.notContacted ?? 0, danger: false, icon: 'phone-off' as const },
  { label: 'AI gagal, perlu diproses ulang', value: data.value?.stats.aiFailed ?? 0, danger: true, icon: 'alert-triangle' as const },
])

const items = computed(() => data.value?.items ?? [])
const totalPages = computed(() => {
  if (!data.value || data.value.pageSize === null) return 1
  return Math.max(1, Math.ceil(data.value.total / data.value.pageSize))
})
const hasFilters = computed(() => Boolean(priority.value || category.value || pipeline.value))

// Keep the list fresh while any visible brief is still waiting for the AI.
const hasRunningAi = computed(() => items.value.some(b => b.aiStatus === 'pending' || b.aiStatus === 'processing'))
usePolling(hasRunningAi, refresh, 3000)
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-1.5">
        <h1 class="font-display text-[34px] font-bold tracking-[-0.02em]">
          Brief masuk
        </h1>
        <p class="text-[15px] text-muted">
          Diurutkan dari yang terbaru. Ringkasan dan prioritas dibuat otomatis oleh AI.
        </p>
      </div>
      <a
        href="/"
        target="_blank"
        class="inline-flex h-11 items-center gap-2 rounded-[10px] border border-line-strong bg-white px-4 text-sm font-semibold"
      >
        <AppIcon name="external" />
        Buka form publik
      </a>
    </div>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div
        v-for="s in stats"
        :key="s.label"
        class="flex min-w-0 flex-col gap-1.5 rounded-[14px] border border-line bg-white px-[18px] py-4"
      >
        <div class="flex items-start justify-between gap-2">
          <span class="text-[13px] text-muted">{{ s.label }}</span>
          <span
            class="flex size-8 flex-none items-center justify-center rounded-lg"
            :class="s.danger && s.value > 0 ? 'bg-danger-soft text-danger' : 'bg-brand-soft text-brand'"
          >
            <AppIcon
              :name="s.icon"
              :size="16"
            />
          </span>
        </div>
        <span
          class="font-display text-[30px] font-bold tracking-[-0.02em] tabular-nums"
          :class="s.danger && s.value > 0 ? 'text-danger' : 'text-ink'"
        >{{ s.value }}</span>
      </div>
    </div>

    <section
      aria-label="Daftar brief"
      class="overflow-hidden rounded-2xl border border-line bg-white"
    >
      <div class="flex flex-col gap-3 border-b border-line-soft px-5 py-4">
        <FilterChips
          v-model="priority"
          label="Prioritas"
          icon="flame"
          :options="PRIORITIES"
        />
        <FilterChips
          v-model="category"
          label="Kategori"
          icon="tag"
          :options="SERVICE_CATEGORIES"
        />
        <FilterChips
          v-model="pipeline"
          label="Pipeline"
          icon="workflow"
          :options="PIPELINE_STATUSES"
          :labels="PIPELINE_LABELS"
        />
      </div>

      <div
        v-if="error"
        role="alert"
        class="px-5 py-12 text-center text-sm text-danger"
      >
        {{ getApiErrorMessage(error, 'Gagal memuat daftar brief.') }}
      </div>

      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr class="bg-subtle text-left text-xs font-semibold tracking-[0.04em] text-muted uppercase">
              <th
                scope="col"
                class="px-5 py-3"
              >
                Perusahaan
              </th>
              <th
                scope="col"
                class="px-4 py-3"
              >
                Kategori
              </th>
              <th
                scope="col"
                class="px-4 py-3"
              >
                Prioritas
              </th>
              <th
                scope="col"
                class="px-4 py-3"
              >
                Status AI
              </th>
              <th
                scope="col"
                class="px-4 py-3"
              >
                Pipeline
              </th>
              <th
                scope="col"
                class="px-5 py-3 text-right"
              >
                Masuk
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="b in items"
              :key="b.id"
              class="cursor-pointer border-t border-line-soft hover:bg-subtle"
              @click="navigateTo(`/admin/briefs/${b.id}`)"
            >
              <td class="px-5 py-3.5">
                <div class="flex flex-col gap-0.5">
                  <NuxtLink
                    :to="`/admin/briefs/${b.id}`"
                    class="font-semibold hover:text-brand"
                    @click.stop
                  >
                    {{ b.companyName }}
                  </NuxtLink>
                  <span class="text-[13px] text-muted">{{ b.name }}</span>
                </div>
              </td>
              <td class="px-4 py-3.5">
                {{ b.serviceCategory ?? '—' }}
              </td>
              <td class="px-4 py-3.5">
                <PriorityBadge :priority="b.priority" />
              </td>
              <td class="px-4 py-3.5">
                <AiStatusBadge :status="b.aiStatus" />
              </td>
              <td class="px-4 py-3.5">
                <PipelineTag :status="b.pipelineStatus" />
              </td>
              <td class="px-5 py-3.5 text-right whitespace-nowrap text-muted tabular-nums">
                {{ formatDateTime(b.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="!error && status !== 'pending' && items.length === 0"
        class="flex flex-col items-center gap-2 px-5 py-12 text-center"
      >
        <span class="mb-1 flex size-12 items-center justify-center rounded-full bg-subtle text-muted">
          <AppIcon
            :name="hasFilters ? 'filter' : 'inbox'"
            :size="22"
          />
        </span>
        <template v-if="hasFilters">
          <span class="text-[15px] font-semibold">Tidak ada brief untuk filter ini</span>
          <span class="text-sm text-muted">Coba ubah prioritas, kategori, atau status pipeline.</span>
        </template>
        <template v-else>
          <span class="text-[15px] font-semibold">Belum ada brief masuk</span>
          <span class="text-sm text-muted">Brief dari form publik akan muncul di sini.</span>
        </template>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-3.5 text-[13px] text-muted">
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
          <label class="flex items-center gap-2">
            Baris per halaman
            <select
              v-model="perPage"
              class="h-9 cursor-pointer rounded-lg border border-line-strong bg-white pr-8 pl-3 font-medium text-ink"
            >
              <option
                v-for="opt in PAGE_SIZE_OPTIONS"
                :key="opt"
                :value="opt"
              >
                {{ opt === 'all' ? 'Semua' : opt }}
              </option>
            </select>
          </label>
          <span>Menampilkan {{ items.length }} dari {{ data?.total ?? 0 }} brief<template v-if="totalPages > 1"> · Halaman {{ page }} dari {{ totalPages }}</template></span>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            :disabled="page <= 1"
            class="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-line-strong bg-white px-3 font-medium text-ink disabled:cursor-default disabled:border-line disabled:text-faint"
            @click="updateQuery({ page: page - 1 })"
          >
            <AppIcon name="chevron-left" />
            Sebelumnya
          </button>
          <button
            type="button"
            :disabled="page >= totalPages"
            class="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-line-strong bg-white px-3 font-medium text-ink disabled:cursor-default disabled:border-line disabled:text-faint"
            @click="updateQuery({ page: page + 1 })"
          >
            Berikutnya
            <AppIcon name="chevron-right" />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
