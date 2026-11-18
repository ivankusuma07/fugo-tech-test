<script setup lang="ts">
/** Small inline icon set (stroke icons from the design reference). */
const props = withDefaults(defineProps<{ name: keyof typeof paths, size?: number, strokeWidth?: number }>(), {
  size: 16,
  strokeWidth: 2,
})

const paths = {
  'arrow-right': ['M5 12h14', 'm13 6 6 6-6 6'],
  'chevron-left': ['m15 6-6 6 6 6'],
  'check': ['m5 12.5 4.5 4.5L19 7.5'],
  'alert-circle': ['M12 8v5', 'M12 16h.01'],
  'alert-triangle': ['M12 3 2 20h20Z', 'M12 10v4', 'M12 17h.01'],
  'eye': ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z'],
  'eye-off': ['M3 3l18 18', 'M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1', 'M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
  'lock': ['M8 10V7a4 4 0 0 1 8 0v3'],
  'inbox': ['M3 13h5l2 3h4l2-3h5', 'M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6Z'],
  'logout': ['M15 4h4v16h-4', 'M10 8l-4 4 4 4', 'M6 12h10'],
  'external': ['M14 4h6v6', 'M20 4 10 14', 'M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5'],
  'refresh': ['M20 11a8 8 0 1 0-2.3 5.7', 'M20 5v6h-6'],
  'sparkle': ['M12 3v3', 'M12 18v3', 'M3 12h3', 'M18 12h3', 'm6 6 2 2', 'm16 16 2 2', 'm6 18 2-2', 'm16 8 2-2'],
  'spinner': ['M21 12a9 9 0 1 1-9-9'],
} as const

const circles: Partial<Record<keyof typeof paths, { cx: number, cy: number, r: number }>> = {
  'alert-circle': { cx: 12, cy: 12, r: 9 },
  'eye': { cx: 12, cy: 12, r: 3 },
  'sparkle': { cx: 12, cy: 12, r: 3 },
}
const rects: Partial<Record<keyof typeof paths, { x: number, y: number, width: number, height: number, rx: number }>> = {
  lock: { x: 4, y: 10, width: 16, height: 11, rx: 2 },
}
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="props.strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    :class="{ 'animate-spin': props.name === 'spinner' }"
  >
    <circle
      v-if="circles[props.name]"
      v-bind="circles[props.name]"
    />
    <rect
      v-if="rects[props.name]"
      v-bind="rects[props.name]"
    />
    <path
      v-for="d in paths[props.name]"
      :key="d"
      :d="d"
    />
  </svg>
</template>
