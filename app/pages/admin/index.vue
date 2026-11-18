<script setup lang="ts">
import { PRIORITIES, SERVICE_CATEGORIES, type Priority, type ServiceCategory } from '#shared/constants'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Brief masuk — Brief Inbox' })

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
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

function updateQuery(patch: Record<string, string | number | undefined>) {
  router.replace({ query: { ...route.query, ...patch } })
}

const { data, error, refresh, status } = await useFetch('/api/admin/briefs', {
  query: { priority, category, page },
})

const stats = computed(() => [
  { label: 'Total brief', value: data.value?.stats.total ?? 0, danger: false },
  { label: 'Prioritas High', value: data.value?.stats.high ?? 0, danger: true },
  { label: 'Belum dihubungi', value: data.value?.stats.notContacted ?? 0, danger: false },
  { label: 'AI gagal, perlu diproses ulang', value: data.value?.stats.aiFailed ?? 0, danger: true },
])

const items = computed(() => data.value?.items ?? [])
const totalPages = computed(() => (data.value ? Math.max(1, Math.ceil(data.value.total / data.value.pageSize)) : 1))

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
        <span class="text-[13px] text-muted">{{ s.label }}</span>
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
          :options="PRIORITIES"
        />
        <FilterChips
          v-model="category"
          label="Kategori"
          :options="SERVICE_CATEGORIES"
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
        <template v-if="priority || category">
          <span class="text-[15px] font-semibold">Tidak ada brief untuk filter ini</span>
          <span class="text-sm text-muted">Coba ubah prioritas atau kategori.</span>
        </template>
        <template v-else>
          <span class="text-[15px] font-semibold">Belum ada brief masuk</span>
          <span class="text-sm text-muted">Brief dari form publik akan muncul di sini.</span>
        </template>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-3.5 text-[13px] text-muted">
        <span>Menampilkan {{ items.length }} dari {{ data?.total ?? 0 }} brief</span>
        <div class="flex gap-2">
          <button
            type="button"
            :disabled="page <= 1"
            class="h-9 cursor-pointer rounded-lg border border-line-strong bg-white px-3 font-medium text-ink disabled:cursor-default disabled:border-line disabled:text-faint"
            @click="updateQuery({ page: page - 1 })"
          >
            Sebelumnya
          </button>
          <button
            type="button"
            :disabled="page >= totalPages"
            class="h-9 cursor-pointer rounded-lg border border-line-strong bg-white px-3 font-medium text-ink disabled:cursor-default disabled:border-line disabled:text-faint"
            @click="updateQuery({ page: page + 1 })"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
