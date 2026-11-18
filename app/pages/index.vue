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
const formErrorKey = ref(0)
watch(formError, (v) => {
  if (v) formErrorKey.value++
})
const submitted = ref<{ number: number | null, name: string, companyName: string, email: string }>()

// Cloudflare Turnstile (off when no site key is configured).
const turnstileSiteKey = useRuntimeConfig().public.turnstileSiteKey
const turnstileToken = ref('')
const turnstile = useTemplateRef<{ reset: () => void }>('turnstile')

function onTurnstileError(code: string) {
  formError.value = `Verifikasi keamanan tidak bisa dimuat (kode ${code}). Muat ulang halaman lalu coba lagi.`
}

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
  if (turnstileSiteKey && !turnstileToken.value) {
    formError.value = 'Selesaikan verifikasi keamanan terlebih dahulu.'
    return
  }

  submitting.value = true
  try {
    const res = await $fetch<{ id: string | null, number: number | null }>('/api/briefs', {
      method: 'POST',
      body: { ...form, turnstileToken: turnstileToken.value || undefined },
    })
    submitted.value = { number: res.number, name: form.name, companyName: form.companyName, email: form.email }
  }
  catch (error) {
    errors.value = getApiFieldErrors(error)
    formError.value = getApiErrorMessage(error)
    // The token is single-use: get a fresh one for the next attempt.
    turnstile.value?.reset()
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

    <Transition
      name="page-swap"
      mode="out-in"
    >
      <!-- Success state (design screen 2) -->
      <main
        v-if="submitted"
        key="success"
        class="mx-auto max-w-[640px] px-4 pt-[72px] pb-24 sm:px-8"
      >
        <div class="anim-pop flex flex-col items-center gap-5 rounded-3xl border border-line bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(23,24,28,0.04),0_12px_32px_-12px_rgba(23,24,28,0.12)] sm:px-10">
          <div class="relative flex size-[72px] items-center justify-center rounded-full bg-ok-soft text-ok">
            <span
              aria-hidden="true"
              class="anim-ripple absolute inset-0 rounded-full bg-ok-soft"
            />
            <AppIcon
              name="badge-check"
              :size="34"
              :stroke-width="2.2"
              class="anim-check relative"
            />
          </div>
          <h1
            class="anim-rise font-display text-[40px] leading-[1.08] font-bold tracking-[-0.025em]"
            style="--delay: 220ms"
          >
            Brief berhasil terkirim
          </h1>
          <p
            class="anim-rise max-w-[440px] text-base leading-relaxed text-muted"
            style="--delay: 300ms"
          >
            Terima kasih, {{ submitted.name }}. Brief untuk
            <strong class="font-semibold text-ink">{{ submitted.companyName }}</strong>
            sudah kami terima dan sedang ditinjau tim sales.
          </p>

          <dl
            class="anim-rise mt-2 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-2"
            style="--delay: 380ms"
          >
            <div
              v-if="submitted.number"
              class="flex flex-col gap-1 rounded-[14px] bg-canvas px-4 py-3.5"
            >
              <dt class="flex items-center gap-1.5 text-xs font-semibold tracking-[0.04em] text-muted uppercase">
                <AppIcon
                  name="file-text"
                  :size="13"
                />
                Nomor brief
              </dt>
              <dd class="text-[15px] font-semibold tabular-nums">
                {{ formatBriefNumber(submitted.number) }}
              </dd>
            </div>
            <div class="flex flex-col gap-1 rounded-[14px] bg-canvas px-4 py-3.5">
              <dt class="flex items-center gap-1.5 text-xs font-semibold tracking-[0.04em] text-muted uppercase">
                <AppIcon
                  name="mail"
                  :size="13"
                />
                Konfirmasi ke
              </dt>
              <dd class="truncate text-[15px] font-semibold">
                {{ submitted.email }}
              </dd>
            </div>
          </dl>

          <div
            class="anim-rise mt-3 flex flex-wrap justify-center gap-3"
            style="--delay: 460ms"
          >
            <button
              type="button"
              class="group inline-flex h-[46px] cursor-pointer items-center gap-2 rounded-xl border border-line-strong bg-white px-5 text-[15px] font-semibold transition hover:-translate-y-0.5 hover:border-ink hover:shadow-[0_6px_16px_-8px_rgba(23,24,28,0.35)] active:translate-y-0 active:scale-[0.98]"
              @click="reset"
            >
              <AppIcon
                name="send"
                class="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
              Kirim brief lain
            </button>
          </div>
        </div>
      </main>

      <!-- Form (design screen 1) -->
      <main
        v-else
        key="form"
        class="mx-auto flex max-w-[1200px] flex-wrap items-start gap-14 px-4 pt-6 pb-20 sm:px-8"
      >
        <section class="flex min-w-0 flex-[1_1_360px] flex-col gap-7 pt-6">
          <span class="anim-rise inline-flex items-center gap-1.5 self-start rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-semibold text-brand">
            <AppIcon
              name="sparkle"
              :size="14"
              class="anim-twinkle"
            />
            Mulai proyek baru
          </span>
          <h1
            class="anim-rise font-display text-[40px] leading-[1.02] font-bold tracking-[-0.03em] sm:text-[56px]"
            style="--delay: 80ms"
          >
            Ceritakan proyekmu, kami yang susun langkahnya.
          </h1>
          <p
            class="anim-rise max-w-[460px] text-[17px] leading-relaxed text-muted"
            style="--delay: 160ms"
          >
            Branding, website, aplikasi, sampai otomasi AI. Isi brief singkat ini dan tim kami akan meninjaunya.
          </p>
          <ol class="mt-2 flex flex-col gap-[18px]">
            <li
              v-for="(step, i) in [
                ['Kirim brief', 'Cukup 2 menit, tanpa perlu akun.', 'send'] as const,
                ['Tim kami meninjau', 'Kami pelajari kebutuhan, budget, dan timeline-mu.', 'list-checks'] as const,
                ['Kami menghubungimu', 'Lewat email untuk diskusi lebih lanjut.', 'mail'] as const,
              ]"
              :key="i"
              class="anim-rise group flex items-start gap-3.5"
              :style="{ '--delay': `${260 + i * 90}ms` }"
            >
              <span class="flex size-9 flex-none items-center justify-center rounded-full bg-white text-brand shadow-[0_0_0_1.5px_var(--color-ink)] transition duration-300 group-hover:-translate-y-0.5 group-hover:bg-brand group-hover:text-white group-hover:shadow-[0_0_0_1.5px_var(--color-brand)]">
                <AppIcon
                  :name="step[2]"
                  :size="16"
                />
                <span class="sr-only">Langkah {{ i + 1 }}</span>
              </span>
              <div class="flex flex-col gap-0.5">
                <strong class="text-[15px] font-semibold">{{ step[0] }}</strong>
                <span class="text-sm text-muted">{{ step[1] }}</span>
              </div>
            </li>
          </ol>
        </section>

        <form
          class="anim-rise flex min-w-0 flex-[1_1_520px] flex-col gap-[22px] rounded-[20px] border border-line bg-white p-6 shadow-[0_1px_2px_rgba(23,24,28,0.04),0_12px_32px_-12px_rgba(23,24,28,0.12)] sm:p-9"
          style="--delay: 140ms"
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
                class="h-11 cursor-pointer rounded-full border px-4 text-sm font-medium transition duration-200 active:scale-95"
                :class="form.budgetRange === b ? 'scale-[1.03] border-ink bg-ink text-white shadow-[0_6px_14px_-8px_rgba(23,24,28,0.5)]' : 'border-line-strong bg-white text-ink hover:-translate-y-0.5 hover:border-ink'"
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

          <ClientOnly v-if="turnstileSiteKey">
            <TurnstileWidget
              ref="turnstile"
              v-model="turnstileToken"
              :site-key="turnstileSiteKey"
              action="brief"
              @error="onTurnstileError"
            />
          </ClientOnly>

          <div
            v-if="formError"
            :key="formErrorKey"
            role="alert"
            class="anim-shake flex items-start gap-2.5 rounded-[10px] border border-[#F7C9C3] bg-danger-soft px-3.5 py-3 text-sm text-danger-ink"
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
              class="group mt-4 inline-flex h-12 cursor-pointer items-center gap-2.5 rounded-xl bg-ink px-6 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand hover:shadow-[0_10px_24px_-10px_rgba(52,70,212,0.7)] active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70 disabled:shadow-none"
            >
              {{ submitting ? 'Mengirim…' : 'Kirim brief' }}
              <AppIcon
                :name="submitting ? 'spinner' : 'arrow-right'"
                :size="18"
                class="transition-transform duration-300 group-hover:translate-x-1"
              />
            </button>
          </div>
        </form>
      </main>
    </Transition>
  </div>
</template>
