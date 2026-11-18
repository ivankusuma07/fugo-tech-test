<script setup lang="ts">
useHead({ title: 'Masuk — Brief Inbox' })

const route = useRoute()
const { fetch: refreshSession } = useUserSession()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref<string>()
const submitting = ref(false)

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
    <aside class="flex min-w-0 flex-[1_1_420px] flex-col justify-between gap-12 bg-ink p-8 text-canvas sm:p-12">
      <AppLogo
        label="Brief Inbox"
        inverted
      />
      <div class="flex max-w-[460px] flex-col gap-5">
        <h1 class="font-display text-[34px] leading-[1.05] font-bold tracking-[-0.025em] sm:text-[44px]">
          Semua brief masuk, sudah diringkas dan diprioritaskan.
        </h1>
        <p class="text-base leading-relaxed text-[#B9BBC2]">
          Ringkasan, kategori, dan prioritas dibuat AI begitu brief masuk. Tim sales tinggal menindaklanjuti.
        </p>
      </div>
      <div
        aria-hidden="true"
        class="flex max-w-[420px] flex-col gap-3 rounded-2xl border border-[#33363E] bg-[#23252B] p-[18px]"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm font-semibold">PT Sinar Kopi Nusantara</span>
          <span class="rounded-full bg-[#3A2220] px-2.5 py-1 text-xs font-semibold text-[#FFB4AB]">High</span>
        </div>
        <span class="text-[13px] leading-normal text-[#B9BBC2]">Website company profile + katalog produk kopi, butuh live sebelum peluncuran produk baru.</span>
        <div class="flex gap-2">
          <span class="rounded-full border border-[#3D4048] px-2.5 py-1 text-xs text-[#D9DAE0]">Website</span>
          <span class="rounded-full border border-[#3D4048] px-2.5 py-1 text-xs text-[#D9DAE0]">Rp25–50 jt</span>
        </div>
      </div>
    </aside>

    <main class="flex min-w-0 flex-[1_1_480px] items-center justify-center px-4 py-12 sm:px-8">
      <form
        class="flex w-full max-w-[400px] flex-col gap-[22px]"
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
          role="alert"
          class="flex items-start gap-2.5 rounded-[10px] border border-[#F7C9C3] bg-danger-soft px-3.5 py-3 text-sm leading-snug text-danger-ink"
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
          class="flex h-12 cursor-pointer items-center justify-center rounded-xl bg-ink text-[15px] font-semibold text-white disabled:cursor-wait disabled:opacity-70"
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
