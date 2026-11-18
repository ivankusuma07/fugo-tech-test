<script setup lang="ts">
import {
  PIPELINE_LABELS,
  PIPELINE_STATUSES,
  PIPELINE_TRANSITIONS,
  type PipelineStatus,
} from '#shared/constants'

const props = defineProps<{ status: PipelineStatus, busy?: boolean }>()
const emit = defineEmits<{ change: [to: PipelineStatus] }>()

const isFinal = computed(() => PIPELINE_TRANSITIONS[props.status].length === 0)

const steps = computed(() => {
  const current = props.status
  // Steps before this index were really passed (forward-only, one step at a time).
  const passed = isFinal.value ? PIPELINE_STATUSES.indexOf('won') : PIPELINE_STATUSES.indexOf(current)
  return PIPELINE_STATUSES.map((s, i) => {
    const on = s === current
    const done = !on && i < passed
    const allowed = PIPELINE_TRANSITIONS[current].includes(s)
    let cls: string
    if (on && s === 'won') cls = 'bg-ok border-ok text-white font-semibold'
    else if (on && s === 'lost') cls = 'bg-danger border-danger text-white font-semibold'
    else if (on) cls = 'bg-ink border-ink text-white font-semibold'
    else if (done) cls = 'bg-brand-soft border-brand-soft text-brand-ink'
    else if (allowed) cls = 'bg-white border-ink text-ink font-semibold cursor-pointer hover:bg-canvas'
    else cls = 'bg-subtle border-dashed border-line-strong text-faint cursor-not-allowed'
    return { status: s, label: PIPELINE_LABELS[s], on, done, allowed, cls }
  })
})
</script>

<template>
  <div
    role="group"
    aria-label="Status pipeline"
    class="flex flex-wrap items-center gap-1.5"
  >
    <button
      v-for="s in steps"
      :key="s.status"
      type="button"
      :disabled="!s.allowed || busy"
      :aria-pressed="s.on"
      class="inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition duration-300 enabled:hover:-translate-y-0.5 enabled:active:scale-95"
      :class="[s.cls, { 'cursor-wait opacity-60': busy && s.allowed }]"
      @click="emit('change', s.status)"
    >
      <AppIcon
        v-if="s.done"
        class="anim-check"
        name="check"
        :size="14"
        :stroke-width="2.5"
      />
      {{ s.label }}
    </button>
  </div>
</template>
