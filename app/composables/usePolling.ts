/**
 * Calls `refresh` every `intervalMs` while `active` is true (e.g. while an AI job
 * is pending/processing). Stops on unmount.
 */
export function usePolling(active: Ref<boolean> | ComputedRef<boolean>, refresh: () => unknown, intervalMs = 3000) {
  let timer: ReturnType<typeof setInterval> | undefined

  const stop = () => {
    if (timer) clearInterval(timer)
    timer = undefined
  }

  watch(
    active,
    (on) => {
      stop()
      if (on && import.meta.client) timer = setInterval(refresh, intervalMs)
    },
    { immediate: true },
  )

  onBeforeUnmount(stop)
}
