<script setup lang="ts">
const { user, clear } = useUserSession()

// On desktop only <main> scrolls (the sidebar stays put), so reset it when the page changes.
const mainEl = useTemplateRef<HTMLElement>('main')
const route = useRoute()
watch(() => route.path, () => mainEl.value?.scrollTo({ top: 0 }))

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-canvas md:h-dvh md:min-h-0 md:flex-row md:overflow-hidden">
    <nav
      aria-label="Navigasi utama"
      class="flex flex-col gap-4 border-b border-line bg-white px-4 py-4 md:w-[248px] md:flex-none md:gap-7 md:overflow-y-auto md:border-r md:border-b-0 md:py-6"
    >
      <div class="flex items-center justify-between gap-2.5 px-2">
        <AppLogo label="Brief Inbox" />
      </div>
      <div class="flex flex-col gap-1">
        <NuxtLink
          to="/admin"
          class="group flex h-11 items-center gap-2.5 rounded-[10px] bg-brand-soft px-3 text-sm font-semibold text-brand-ink transition hover:bg-[#E2E5FC]"
        >
          <AppIcon
            name="inbox"
            :size="18"
          />
          Semua brief
        </NuxtLink>
      </div>
      <div class="flex items-center justify-between gap-3 border-t border-line-soft px-2 pt-3 md:mt-auto md:flex-col md:items-stretch">
        <div class="flex min-w-0 items-center gap-2.5">
          <div class="flex size-8 flex-none items-center justify-center rounded-full border border-line bg-canvas text-[13px] font-semibold">
            A
          </div>
          <div class="flex min-w-0 flex-col">
            <span class="text-sm font-semibold">Admin</span>
            <span class="truncate text-xs text-muted">{{ user?.email }}</span>
          </div>
        </div>
        <button
          type="button"
          class="group flex h-11 cursor-pointer items-center gap-2 px-1 text-sm text-muted transition-colors hover:text-ink"
          @click="logout"
        >
          <AppIcon
            name="logout"
            class="transition-transform duration-200 group-hover:translate-x-0.5"
          />
          Keluar
        </button>
      </div>
    </nav>

    <main
      ref="main"
      class="flex min-w-0 flex-1 flex-col gap-6 px-4 pt-7 pb-14 sm:px-10 md:overflow-y-auto"
    >
      <slot />
    </main>
  </div>
</template>
