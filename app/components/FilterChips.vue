<script setup lang="ts" generic="T extends string">
/** A row of single-select chips. `undefined` means "Semua" (no filter). */
import type { IconName } from './AppIcon.vue'

/** `labels` maps option values to display text (defaults to the value itself). */
defineProps<{ label: string, options: readonly T[], icon?: IconName, labels?: Partial<Record<T, string>> }>()
const model = defineModel<T | undefined>()
</script>

<template>
  <div
    role="group"
    :aria-label="`Filter ${label.toLowerCase()}`"
    class="flex flex-wrap items-center gap-2"
  >
    <span class="flex w-[92px] items-center gap-1.5 text-[13px] font-semibold text-muted">
      <AppIcon
        v-if="icon"
        :name="icon"
        :size="14"
      />
      {{ label }}
    </span>
    <button
      v-for="opt in [undefined, ...options]"
      :key="opt ?? 'all'"
      type="button"
      :aria-pressed="model === opt"
      class="h-9 cursor-pointer rounded-full border px-3.5 text-[13px] font-medium transition duration-200 active:scale-95"
      :class="model === opt ? 'border-ink bg-ink text-white shadow-[0_4px_12px_-6px_rgba(23,24,28,0.5)]' : 'border-line-strong bg-white text-ink hover:-translate-y-px hover:border-ink'"
      @click="model = opt"
    >
      {{ opt === undefined ? 'Semua' : (labels?.[opt] ?? opt) }}
    </button>
  </div>
</template>
