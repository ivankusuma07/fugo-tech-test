<script setup lang="ts">
import { AI_STATUS_LABELS, type AiStatus } from '#shared/constants'

const props = defineProps<{ status: AiStatus, label?: string }>()

const tone: Record<AiStatus, { text: string, dot: string }> = {
  pending: { text: 'text-muted', dot: 'bg-faint' },
  processing: { text: 'text-brand-ink', dot: 'bg-brand animate-pulse' },
  completed: { text: 'text-ok', dot: 'bg-ok-dot' },
  failed: { text: 'text-danger', dot: 'bg-danger-dot' },
}
</script>

<template>
  <span
    class="inline-flex items-center gap-2 text-[13px] font-semibold whitespace-nowrap"
    :class="tone[props.status].text"
  >
    <span
      aria-hidden="true"
      class="size-2 rounded-full"
      :class="tone[props.status].dot"
    />
    {{ props.label ?? AI_STATUS_LABELS[props.status] }}
  </span>
</template>
