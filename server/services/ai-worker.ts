import { claimPendingBriefs, processBrief, recoverStuckBriefs } from './ai.service'

/**
 * In-process background worker. The queue *is* the briefs table (ai_status), so
 * jobs survive restarts. One Node process is enough for this internal tool;
 * scaling out works too, because claims use FOR UPDATE SKIP LOCKED.
 */
const BATCH_SIZE = 3

let timer: NodeJS.Timeout | undefined
let running = false
let again = false

async function tick() {
  if (running) {
    again = true // a nudge arrived mid-run: go again right after
    return
  }
  running = true
  try {
    do {
      again = false
      const recovered = await recoverStuckBriefs()
      if (recovered) console.warn(`[ai-worker] recovered ${recovered} stuck brief(s)`)

      const claimed = await claimPendingBriefs(BATCH_SIZE)
      if (claimed.length) {
        await Promise.all(claimed.map(processBrief))
        again = true // there may be more pending rows
      }
    } while (again)
  }
  catch (error) {
    console.error('[ai-worker] tick failed:', error)
  }
  finally {
    running = false
  }
}

export function startAiWorker(intervalMs: number) {
  if (timer) return
  timer = setInterval(tick, intervalMs)
  timer.unref()
  void tick()
  console.info(`[ai-worker] started, polling every ${intervalMs} ms`)
}

export function stopAiWorker() {
  if (timer) clearInterval(timer)
  timer = undefined
}

/** Process new work now instead of waiting for the next poll. Safe to call anytime. */
export function nudgeAiWorker() {
  if (timer) void tick()
}
