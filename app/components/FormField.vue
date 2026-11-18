<script setup lang="ts">
defineProps<{ label: string, for: string, error?: string, hint?: string, required?: boolean }>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <label
      :for="$props.for"
      class="text-sm font-semibold"
    >
      {{ label }} <span
        v-if="required"
        class="text-danger"
      >*</span>
    </label>
    <slot />
    <span
      v-if="error"
      :id="`${$props.for}-err`"
      class="flex items-center gap-1.5 text-[13px] font-medium text-danger"
    >
      <AppIcon name="alert-circle" />
      {{ error }}
    </span>
    <span
      v-else-if="hint"
      class="text-[13px] text-muted"
    >{{ hint }}</span>
  </div>
</template>
