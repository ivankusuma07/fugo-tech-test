<script setup lang="ts">
import { AI_STATUS_LABELS, type AiStatus } from '#shared/constants'

const props = defineProps<{ status: AiStatus, label?: string }>()

const tone = {
  pending: { text: 'text-muted', icon: 'clock' },
  processing: { text: 'text-brand-ink', icon: 'spinner' },
  completed: { text: 'text-ok', icon: 'circle-check' },
  failed: { text: 'text-danger', icon: 'circle-x' },
} as const satisfies Record<AiStatus, unknown>
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap"
    :class="tone[props.status].text"
  >
    <AppIcon
      :name="tone[props.status].icon"
      :size="15"
    />
    {{ props.label ?? AI_STATUS_LABELS[props.status] }}
  </span>
</template>
