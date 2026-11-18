<script setup lang="ts">
useHead({ title: 'Masuk — Brief Inbox' })

const route = useRoute()
const { fetch: refreshSession } = useUserSession()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref<string>()
const submitting = ref(false)
const errorKey = ref(0)
watch(error, (v) => {
  if (v) errorKey.value++
})

async function login() {
  error.value = undefined
  submitting.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { email: email.value, password: password.value } })
    await refreshSession()
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/admin')
      ? route.query.redirect
      : '/admin'
    await navigateTo(redirect)
  }
  catch (e) {
    error.value = getApiErrorMessage(e, 'Gagal masuk. Coba lagi.')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-wrap bg-canvas">
    <aside class="relative flex min-w-0 flex-[1_1_420px] flex-col justify-between gap-12 overflow-hidden bg-ink bg-[radial-gradient(#2E3038_1px,transparent_1px)] bg-size-[22px_22px] p-8 text-canvas sm:p-12">
      <AppLogo
        label="Brief Inbox"
        inverted
        class="anim-rise"
      />
      <div class="flex max-w-[480px] flex-col gap-5">
        <span
          class="anim-rise inline-flex items-center gap-2 self-start rounded-full border border-[#33363E] px-3 py-1 font-mono text-[11px] tracking-[0.08em] text-[#B9BBC2] uppercase"
          style="--delay: 60ms"
        >
          <span class="relative flex size-2">
            <span class="absolute inline-flex size-full animate-ping rounded-full bg-ok-dot opacity-60" />
            <span class="relative inline-flex size-2 rounded-full bg-ok-dot" />
          </span>
          AI aktif · brief diproses otomatis
        </span>
        <h1 class="font-display text-[34px] leading-[1.12] font-bold tracking-[-0.025em] sm:text-[44px]">
          <span class="sr-only">Semua brief masuk, sudah diringkas, diprioritaskan, dan dikategorikan.</span>
          <span
            aria-hidden="true"
            class="anim-rise block"
            style="--delay: 120ms"
          >Semua brief masuk,</span>
          <span
            aria-hidden="true"
            class="anim-rise block"
            style="--delay: 200ms"
          >sudah <RotatingWord :words="['diringkas', 'diprioritaskan', 'dikategorikan']" />.</span>
        </h1>
        <p
          class="anim-rise text-base leading-relaxed text-[#B9BBC2]"
          style="--delay: 280ms"
        >
          Ringkasan, kategori, dan prioritas dibuat AI begitu brief masuk. Tim sales tinggal menindaklanjuti.
        </p>
      </div>
      <LoginBriefDeck
        class="anim-pop"
        style="--delay: 360ms"
      />
    </aside>

    <main class="flex min-w-0 flex-[1_1_480px] items-center justify-center px-4 py-12 sm:px-8">
      <form
        class="anim-rise flex w-full max-w-[400px] flex-col gap-[22px]"
        style="--delay: 120ms"
        @submit.prevent="login"
      >
        <div class="flex flex-col gap-2">
          <h2 class="font-display text-[32px] font-bold tracking-[-0.02em]">
            Masuk ke dashboard
          </h2>
          <p class="text-[15px] text-muted">
            Khusus tim internal Fugo Creative.
          </p>
        </div>
        <div class="flex flex-col gap-2">
          <label
            for="l-email"
            class="text-sm font-semibold"
          >Email</label>
          <input
            id="l-email"
            v-model="email"
            type="email"
            autocomplete="username"
            required
            class="h-[46px] rounded-[10px] border border-line-strong bg-white px-3.5 text-[15px]"
          >
        </div>
        <div class="flex flex-col gap-2">
          <label
            for="l-pass"
            class="text-sm font-semibold"
          >Password</label>
          <div class="relative">
            <input
              id="l-pass"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
              class="h-[46px] w-full rounded-[10px] border border-line-strong bg-white pr-12 pl-3.5 text-[15px]"
            >
            <button
              type="button"
              :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
              class="absolute top-px right-0.5 flex size-11 cursor-pointer items-center justify-center text-muted"
              @click="showPassword = !showPassword"
            >
              <AppIcon
                :name="showPassword ? 'eye-off' : 'eye'"
                :size="18"
              />
            </button>
          </div>
        </div>
        <div
          v-if="error"
          :key="errorKey"
          role="alert"
          class="anim-shake flex items-start gap-2.5 rounded-[10px] border border-[#F7C9C3] bg-danger-soft px-3.5 py-3 text-sm leading-snug text-danger-ink"
        >
          <AppIcon
            name="alert-circle"
            :size="18"
            class="mt-px flex-none"
          />
          <span>{{ error }}</span>
        </div>
        <button
          type="submit"
          :disabled="submitting"
          class="flex h-12 cursor-pointer items-center justify-center rounded-xl bg-ink text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand hover:shadow-[0_10px_24px_-10px_rgba(52,70,212,0.7)] active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70 disabled:shadow-none"
        >
          {{ submitting ? 'Memeriksa…' : 'Masuk' }}
        </button>
        <span class="flex items-center gap-2 text-[13px] text-muted">
          <AppIcon name="lock" />
          Halaman dashboard hanya bisa diakses setelah login.
        </span>
      </form>
    </main>
  </div>
</template>
