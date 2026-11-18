<script setup lang="ts">
import type { Priority } from '#shared/constants'

const props = defineProps<{ priority: Priority | null, placeholder?: string }>()

const tone: Record<Priority, string> = {
  High: 'bg-danger-soft text-danger',
  Medium: 'bg-warn-soft text-warn',
  Low: 'bg-neutral-soft text-neutral-ink',
}
</script>

<template>
  <span
    class="inline-flex h-[26px] items-center rounded-full px-2.5 text-[13px] font-semibold whitespace-nowrap"
    :class="props.priority ? tone[props.priority] : (props.placeholder ? 'bg-neutral-soft text-muted' : 'text-muted')"
  >
    {{ props.priority ?? props.placeholder ?? '—' }}
  </span>
</template>
