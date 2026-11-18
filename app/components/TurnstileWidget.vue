<script setup lang="ts">
/**
 * Cloudflare Turnstile, rendered explicitly so the form can reset it after each
 * submit attempt (tokens are single-use). v-model holds the current token,
 * or '' while there is none (not solved yet, expired, or errored).
 */
interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

const props = defineProps<{ siteKey: string, action: string }>()
const token = defineModel<string>({ default: '' })
const emit = defineEmits<{ error: [code: string] }>()

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise: Promise<TurnstileApi> | undefined

function loadTurnstile(): Promise<TurnstileApi> {
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile)
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')))
    script.onerror = () => {
      scriptPromise = undefined // allow a retry on the next mount
      reject(new Error('turnstile script failed to load'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

const container = useTemplateRef<HTMLElement>('container')
let api: TurnstileApi | undefined
let widgetId: string | undefined

onMounted(async () => {
  try {
    api = await loadTurnstile()
  }
  catch {
    emit('error', 'script-load')
    return
  }
  if (!container.value) return
  widgetId = api.render(container.value, {
    'sitekey': props.siteKey,
    'action': props.action,
    'language': 'id',
    'callback': (t: string) => (token.value = t),
    'expired-callback': () => (token.value = ''),
    'timeout-callback': () => (token.value = ''),
    'error-callback': (code: string) => {
      token.value = ''
      emit('error', String(code))
    },
  })
})

onBeforeUnmount(() => {
  if (api && widgetId) api.remove(widgetId)
})

/** Get a fresh token after a submit attempt used the current one. */
function reset() {
  token.value = ''
  if (api && widgetId) api.reset(widgetId)
}

defineExpose({ reset })
</script>

<template>
  <div
    ref="container"
    class="min-h-[65px]"
  />
</template>
