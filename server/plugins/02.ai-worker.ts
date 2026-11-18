import { startAiWorker, stopAiWorker } from '../services/ai-worker'

export default defineNitroPlugin((nitroApp) => {
  if (import.meta.prerender) return
  const { AI_WORKER_ENABLED, AI_WORKER_INTERVAL_MS } = useEnv()
  if (!AI_WORKER_ENABLED) return

  startAiWorker(AI_WORKER_INTERVAL_MS)
  nitroApp.hooks.hook('close', stopAiWorker)
})
