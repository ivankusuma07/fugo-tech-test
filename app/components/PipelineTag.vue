<script setup lang="ts">
import { PIPELINE_LABELS, type PipelineStatus } from '#shared/constants'

defineProps<{ status: PipelineStatus, prefix?: string }>()
</script>

<template>
  <span class="inline-flex h-[26px] items-center rounded-md border border-line px-2.5 text-[13px] font-medium whitespace-nowrap">
    {{ prefix }}{{ PIPELINE_LABELS[status] }}
  </span>
</template>
