<script setup lang="ts">
import { BUDGET_LABELS, BUDGET_RANGES, type BudgetRange } from '#shared/constants'
import { BriefInputSchema } from '#shared/schemas/brief-input'
import { todayInJakarta } from '#shared/utils/date'
import { z } from 'zod'

useHead({ title: 'Kirim brief proyek — Fugo Creative' })

const form = reactive({
  name: '',
  email: '',
  companyName: '',
  needs: '',
  budgetRange: undefined as BudgetRange | undefined,
  targetDate: '',
  website: '', // honeypot, hidden from humans
})

const errors = ref<Record<string, string | undefined>>({})
const formError = ref<string>()
const submitting = ref(false)
const submitted = ref<{ number: number | null, name: string, companyName: string, email: string }>()

const minDate = todayInJakarta()
const fieldClass = (key: string) =>
  errors.value[key]
    ? 'border-[1.5px] border-danger bg-danger-tint'
    : 'border border-line-strong bg-white'

function validate(): boolean {
  // Same schema the API uses; the API is still the authority.
  const result = BriefInputSchema.safeParse(form)
  if (result.success) {
    errors.value = {}
    return true
  }
  errors.value = Object.fromEntries(
    Object.entries(z.flattenError(result.error).fieldErrors).map(([k, v]) => [k, (v as string[])[0]]),
  )
  return false
}

async function submit() {
  formError.value = undefined
  if (!validate()) return

  submitting.value = true
  try {
    const res = await $fetch<{ id: string | null, number: number | null }>('/api/briefs', {
      method: 'POST',
      body: form,
    })
    submitted.value = { number: res.number, name: form.name, companyName: form.companyName, email: form.email }
  }
  catch (error) {
    errors.value = getApiFieldErrors(error)
    formError.value = getApiErrorMessage(error)
  }
  finally {
    submitting.value = false
  }
}

function reset() {
  Object.assign(form, { name: '', email: '', companyName: '', needs: '', budgetRange: undefined, targetDate: '', website: '' })
  errors.value = {}
  submitted.value = undefined
}
</script>

<template>
  <div class="min-h-screen bg-canvas">
    <PublicHeader />

    <!-- Success state (design screen 2) -->
    <main
      v-if="submitted"
      class="mx-auto max-w-[640px] px-4 pt-[72px] pb-24 sm:px-8"
    >
      <div class="flex flex-col items-center gap-5 rounded-3xl border border-line bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(23,24,28,0.04),0_12px_32px_-12px_rgba(23,24,28,0.12)] sm:px-10">
        <div class="flex size-[72px] items-center justify-center rounded-full bg-ok-soft text-ok">
          <AppIcon
            name="check"
            :size="34"
            :stroke-width="2.2"
          />
        </div>
        <h1 class="font-display text-[40px] leading-[1.08] font-bold tracking-[-0.025em]">
          Brief berhasil terkirim
        </h1>
        <p class="max-w-[440px] text-base leading-relaxed text-muted">
          Terima kasih, {{ submitted.name }}. Brief untuk
          <strong class="font-semibold text-ink">{{ submitted.companyName }}</strong>
          sudah kami terima dan sedang ditinjau tim sales.
        </p>

        <dl class="mt-2 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-2">
          <div
            v-if="submitted.number"
            class="flex flex-col gap-1 rounded-[14px] bg-canvas px-4 py-3.5"
          >
            <dt class="text-xs font-semibold tracking-[0.04em] text-muted uppercase">
              Nomor brief
            </dt>
            <dd class="text-[15px] font-semibold tabular-nums">
              {{ formatBriefNumber(submitted.number) }}
            </dd>
          </div>
          <div class="flex flex-col gap-1 rounded-[14px] bg-canvas px-4 py-3.5">
            <dt class="text-xs font-semibold tracking-[0.04em] text-muted uppercase">
              Konfirmasi ke
            </dt>
            <dd class="truncate text-[15px] font-semibold">
              {{ submitted.email }}
            </dd>
          </div>
        </dl>

        <div class="mt-3 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            class="inline-flex h-[46px] items-center rounded-xl border border-line-strong bg-white px-5 text-[15px] font-semibold"
            @click="reset"
          >
            Kirim brief lain
          </button>
        </div>
      </div>
    </main>

    <!-- Form (design screen 1) -->
    <main
      v-else
      class="mx-auto flex max-w-[1200px] flex-wrap items-start gap-14 px-4 pt-6 pb-20 sm:px-8"
    >
      <section class="flex min-w-0 flex-[1_1_360px] flex-col gap-7 pt-6">
        <span class="self-start rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-semibold text-brand">Mulai proyek baru</span>
        <h1 class="font-display text-[40px] leading-[1.02] font-bold tracking-[-0.03em] sm:text-[56px]">
          Ceritakan proyekmu, kami yang susun langkahnya.
        </h1>
        <p class="max-w-[460px] text-[17px] leading-relaxed text-muted">
          Branding, website, aplikasi, sampai otomasi AI. Isi brief singkat ini dan tim kami akan meninjaunya.
        </p>
        <ol class="mt-2 flex flex-col gap-[18px]">
          <li
            v-for="(step, i) in [
              ['Kirim brief', 'Cukup 2 menit, tanpa perlu akun.'],
              ['Tim kami meninjau', 'Kami pelajari kebutuhan, budget, dan timeline-mu.'],
              ['Kami menghubungimu', 'Lewat email untuk diskusi lebih lanjut.'],
            ]"
            :key="i"
            class="flex items-start gap-3.5"
          >
            <span class="flex size-[30px] flex-none items-center justify-center rounded-full border-[1.5px] border-ink text-[13px] font-semibold">{{ i + 1 }}</span>
            <div class="flex flex-col gap-0.5">
              <strong class="text-[15px] font-semibold">{{ step[0] }}</strong>
              <span class="text-sm text-muted">{{ step[1] }}</span>
            </div>
          </li>
        </ol>
      </section>

      <form
        class="flex min-w-0 flex-[1_1_520px] flex-col gap-[22px] rounded-[20px] border border-line bg-white p-6 shadow-[0_1px_2px_rgba(23,24,28,0.04),0_12px_32px_-12px_rgba(23,24,28,0.12)] sm:p-9"
        novalidate
        @submit.prevent="submit"
      >
        <div class="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
          <FormField
            label="Nama"
            for="f-name"
            :error="errors.name"
            required
          >
            <input
              id="f-name"
              v-model="form.name"
              type="text"
              autocomplete="name"
              placeholder="Nama lengkap"
              :aria-invalid="!!errors.name"
              class="h-[46px] rounded-[10px] px-3.5 text-[15px]"
              :class="fieldClass('name')"
            >
          </FormField>
          <FormField
            label="Email"
            for="f-email"
            :error="errors.email"
            required
          >
            <input
              id="f-email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              placeholder="nama@perusahaan.com"
              :aria-invalid="!!errors.email"
              class="h-[46px] rounded-[10px] px-3.5 text-[15px]"
              :class="fieldClass('email')"
            >
          </FormField>
        </div>

        <FormField
          label="Nama perusahaan"
          for="f-company"
          :error="errors.companyName"
          required
        >
          <input
            id="f-company"
            v-model="form.companyName"
            type="text"
            autocomplete="organization"
            placeholder="PT / CV / nama brand"
            :aria-invalid="!!errors.companyName"
            class="h-[46px] rounded-[10px] px-3.5 text-[15px]"
            :class="fieldClass('companyName')"
          >
        </FormField>

        <FormField
          label="Jenis kebutuhan"
          for="f-needs"
          :error="errors.needs"
          hint="Semakin detail, semakin cepat kami bisa memberi estimasi."
          required
        >
          <textarea
            id="f-needs"
            v-model="form.needs"
            rows="5"
            placeholder="Ceritakan proyeknya: apa yang ingin dibuat, untuk siapa, dan tujuan utamanya."
            :aria-invalid="!!errors.needs"
            class="resize-y rounded-[10px] px-3.5 py-3 text-[15px] leading-normal"
            :class="fieldClass('needs')"
          />
        </FormField>

        <fieldset class="flex flex-col gap-2.5">
          <legend class="mb-2.5 text-sm font-semibold">
            Budget <span class="text-danger">*</span>
          </legend>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="b in BUDGET_RANGES"
              :key="b"
              type="button"
              :aria-pressed="form.budgetRange === b"
              class="h-11 cursor-pointer rounded-full border px-4 text-sm font-medium"
              :class="form.budgetRange === b ? 'border-ink bg-ink text-white' : 'border-line-strong bg-white text-ink'"
              @click="form.budgetRange = b"
            >
              {{ BUDGET_LABELS[b] }}
            </button>
          </div>
          <span
            v-if="errors.budgetRange"
            class="flex items-center gap-1.5 text-[13px] font-medium text-danger"
          >
            <AppIcon name="alert-circle" /> {{ errors.budgetRange }}
          </span>
        </fieldset>

        <FormField
          label="Target timeline"
          for="f-date"
          :error="errors.targetDate"
          required
        >
          <input
            id="f-date"
            v-model="form.targetDate"
            type="date"
            :min="minDate"
            :aria-invalid="!!errors.targetDate"
            :aria-describedby="errors.targetDate ? 'f-date-err' : undefined"
            class="h-[46px] max-w-[260px] rounded-[10px] px-3.5 text-[15px]"
            :class="fieldClass('targetDate')"
          >
        </FormField>

        <!-- Honeypot: hidden from people, bots tend to fill it -->
        <div
          class="absolute -left-[9999px]"
          aria-hidden="true"
        >
          <label for="f-website">Website</label>
          <input
            id="f-website"
            v-model="form.website"
            type="text"
            tabindex="-1"
            autocomplete="off"
          >
        </div>

        <div
          v-if="formError"
          role="alert"
          class="flex items-start gap-2.5 rounded-[10px] border border-[#F7C9C3] bg-danger-soft px-3.5 py-3 text-sm text-danger-ink"
        >
          <AppIcon
            name="alert-circle"
            :size="18"
            class="mt-px flex-none"
          />
          <span>{{ formError }}</span>
        </div>

        <div class="mt-1 flex flex-wrap items-center justify-between gap-4 border-t border-line-soft pt-1.5">
          <span class="pt-4 text-[13px] text-muted">Data hanya dipakai untuk menindaklanjuti brief ini.</span>
          <button
            type="submit"
            :disabled="submitting"
            class="mt-4 inline-flex h-12 cursor-pointer items-center gap-2.5 rounded-xl bg-ink px-6 text-[15px] font-semibold text-white disabled:cursor-wait disabled:opacity-70"
          >
            {{ submitting ? 'Mengirim…' : 'Kirim brief' }}
            <AppIcon
              :name="submitting ? 'spinner' : 'arrow-right'"
              :size="18"
            />
          </button>
        </div>
      </form>
    </main>
  </div>
</template>
