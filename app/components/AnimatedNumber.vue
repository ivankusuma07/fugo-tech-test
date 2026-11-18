<script setup lang="ts">
/**
 * Counts up (or down) to `value` with an ease-out curve. Renders the final value
 * on the server and when the visitor prefers reduced motion.
 */
const props = withDefaults(defineProps<{ value: number, duration?: number }>(), { duration: 700 })

const shown = ref(props.value)
let frame = 0

function animate(from: number, to: number) {
  cancelAnimationFrame(frame)
  if (from === to || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    shown.value = to
    return
  }
  const start = performance.now()
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / props.duration)
    const eased = 1 - (1 - t) ** 3
    shown.value = Math.round(from + (to - from) * eased)
    if (t < 1) frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)
}

onMounted(() => animate(0, props.value))
watch(() => props.value, (to, from) => animate(from, to))
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <span>{{ shown }}</span>
</template>
