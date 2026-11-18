<script setup lang="ts">
import type { Priority } from '#shared/constants'

const props = defineProps<{ priority: Priority | null, placeholder?: string }>()

const icon = { High: 'flame', Medium: 'clock', Low: 'check' } as const

const tone: Record<Priority, string> = {
  High: 'bg-danger-soft text-danger',
  Medium: 'bg-warn-soft text-warn',
  Low: 'bg-neutral-soft text-neutral-ink',
}
</script>

<template>
  <span
    class="inline-flex h-[26px] items-center gap-1 rounded-full px-2.5 text-[13px] font-semibold whitespace-nowrap"
    :class="props.priority ? tone[props.priority] : (props.placeholder ? 'bg-neutral-soft text-muted' : 'text-muted')"
  >
    <AppIcon
      v-if="props.priority"
      :name="icon[props.priority]"
      :size="13"
      :stroke-width="2.5"
    />
    {{ props.priority ?? props.placeholder ?? '—' }}
  </span>
</template>
