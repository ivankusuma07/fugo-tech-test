<script setup lang="ts">
const { user, clear } = useUserSession()

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-canvas md:flex-row">
    <nav
      aria-label="Navigasi utama"
      class="flex flex-col gap-4 border-b border-line bg-white px-4 py-4 md:w-[248px] md:flex-none md:gap-7 md:border-r md:border-b-0 md:py-6"
    >
      <div class="flex items-center justify-between gap-2.5 px-2">
        <AppLogo label="Brief Inbox" />
      </div>
      <div class="flex flex-col gap-1">
        <NuxtLink
          to="/admin"
          class="flex h-11 items-center gap-2.5 rounded-[10px] bg-brand-soft px-3 text-sm font-semibold text-brand-ink"
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
          class="flex h-11 cursor-pointer items-center gap-2 px-1 text-sm text-muted hover:text-ink"
          @click="logout"
        >
          <AppIcon name="logout" />
          Keluar
        </button>
      </div>
    </nav>

    <main class="flex min-w-0 flex-1 flex-col gap-6 px-4 pt-7 pb-14 sm:px-10">
      <slot />
    </main>
  </div>
</template>
