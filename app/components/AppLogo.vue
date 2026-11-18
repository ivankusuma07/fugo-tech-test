<script setup lang="ts">
withDefaults(defineProps<{ label?: string, inverted?: boolean }>(), {
  label: 'Fugo Creative',
  inverted: false,
})
</script>

<template>
  <div class="flex items-center gap-2.5">
    <div
      class="flex size-8 items-center justify-center rounded-[9px] font-display text-lg font-bold"
      :class="inverted ? 'bg-canvas text-ink' : 'bg-ink text-canvas'"
      aria-hidden="true"
    >
      f
    </div>
    <span class="font-display text-[19px] font-bold tracking-[-0.01em]">{{ label }}</span>
  </div>
</template>
