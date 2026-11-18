<script setup lang="ts">
/**
 * Cycles through `words` with a vertical roll inside a highlight that resizes
 * smoothly to each word. Before mount (SSR) the highlight fits the longest word.
 * Decorative: the parent provides the full sentence for screen readers.
 */
const props = withDefaults(defineProps<{ words: string[], interval?: number }>(), { interval: 2400 })

const index = ref(0)
const wordEls = useTemplateRef<HTMLElement[]>('word')
const widths = ref<number[]>([])
let timer: ReturnType<typeof setInterval> | undefined

function measure() {
  widths.value = (wordEls.value ?? []).map(el => el.offsetWidth)
}

onMounted(async () => {
  await document.fonts?.ready // measure with the display font, not the fallback
  measure()
  window.addEventListener('resize', measure)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  timer = setInterval(() => {
    if (!document.hidden) index.value = (index.value + 1) % props.words.length
  }, props.interval)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  window.removeEventListener('resize', measure)
})

const boxStyle = computed(() => {
  const w = widths.value[index.value]
  return w ? { width: `calc(${w}px + 1.25rem)` } : undefined
})
</script>

<template>
  <span
    aria-hidden="true"
    class="relative inline-grid overflow-hidden rounded-[10px] bg-brand px-2.5 pb-1 align-baseline whitespace-nowrap text-white transition-[width] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
    :style="boxStyle"
  >
    <span
      v-for="(w, i) in words"
      ref="word"
      :key="w"
      class="col-start-1 row-start-1 justify-self-start transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
      :class="i === index ? 'translate-y-0 opacity-100' : (i === (index - 1 + words.length) % words.length ? '-translate-y-full opacity-0' : 'translate-y-full opacity-0')"
    >{{ w }}</span>
  </span>
</template>
