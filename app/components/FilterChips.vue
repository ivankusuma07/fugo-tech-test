<script setup lang="ts" generic="T extends string">
/** A row of single-select chips. `undefined` means "Semua" (no filter). */
defineProps<{ label: string, options: readonly T[] }>()
const model = defineModel<T | undefined>()
</script>

<template>
  <div
    role="group"
    :aria-label="`Filter ${label.toLowerCase()}`"
    class="flex flex-wrap items-center gap-2"
  >
    <span class="w-[76px] text-[13px] font-semibold text-muted">{{ label }}</span>
    <button
      v-for="opt in [undefined, ...options]"
      :key="opt ?? 'all'"
      type="button"
      :aria-pressed="model === opt"
      class="h-9 cursor-pointer rounded-full border px-3.5 text-[13px] font-medium"
      :class="model === opt ? 'border-ink bg-ink text-white' : 'border-line-strong bg-white text-ink hover:border-ink'"
      @click="model = opt"
    >
      {{ opt ?? 'Semua' }}
    </button>
  </div>
</template>
