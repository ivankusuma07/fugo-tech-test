import { and, eq, inArray, lt, sql } from 'drizzle-orm'
import { todayInJakarta } from '#shared/utils/date'
import { aiRuns, briefs, type Brief } from '../db/schema'
import { parseAiOutput } from '../lib/ai-output'
import { callLlm, TransientLlmError, type LlmConfig } from '../lib/llm'
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserMessage } from '../lib/prompts'

/** A row stuck in `processing` longer than this is assumed lost (crash/restart). */
export const STUCK_AFTER_MS = 2 * 60_000
const RETRY_BACKOFF_MS = 1_500

/**
 * Atomically claims up to `limit` pending briefs. FOR UPDATE SKIP LOCKED means two
 * workers (or two ticks) can never pick the same row.
 */
export async function claimPendingBriefs(limit: number): Promise<Brief[]> {
  const db = useDb()
  const pending = db
    .select({ id: briefs.id })
    .from(briefs)
    .where(eq(briefs.aiStatus, 'pending'))
    .orderBy(briefs.createdAt)
    .limit(limit)
    .for('update', { skipLocked: true })

  return db
    .update(briefs)
    .set({
      aiStatus: 'processing',
      aiStartedAt: new Date(),
      aiAttempts: sql`${briefs.aiAttempts} + 1`,
    })
    .where(inArray(briefs.id, pending))
    .returning()
}

/** Puts rows stuck in `processing` back to `pending`. Returns how many were recovered. */
export async function recoverStuckBriefs(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - STUCK_AFTER_MS)
  const rows = await useDb()
    .update(briefs)
    .set({ aiStatus: 'pending' })
    .where(and(eq(briefs.aiStatus, 'processing'), lt(briefs.aiStartedAt, cutoff)))
    .returning({ id: briefs.id })
  return rows.length
}

/**
 * Runs the AI analysis for one claimed brief and persists the outcome.
 * Never throws: every failure ends as ai_status = 'failed' with ai_error set,
 * so a brief can never stay in `processing` because of an LLM problem.
 */
export async function processBrief(brief: Brief): Promise<'completed' | 'failed'> {
  const env = useEnv()
  const started = Date.now()
  let raw: string | null = null
  let model = env.LLM_MODEL

  try {
    if (env.AI_FORCE_FAIL) {
      // Demo hook: a realistic invalid answer that goes through the normal validation path.
      raw = JSON.stringify({
        summary: 'Simulasi output AI yang tidak valid (AI_FORCE_FAIL aktif).',
        service_category: 'Website',
        priority: 'Urgent',
        priority_reason: 'Mode demo kegagalan.',
        missing_info: [],
      })
    }
    else {
      if (!env.LLM_API_KEY) throw new Error('LLM_API_KEY belum diset di server.')
      const config: LlmConfig = {
        baseURL: env.LLM_BASE_URL,
        apiKey: env.LLM_API_KEY,
        model: env.LLM_MODEL,
        timeoutMs: env.LLM_TIMEOUT_MS,
      }
      const response = await callWithOneRetry(config, buildAnalysisUserMessage(brief, todayInJakarta()))
      raw = response.content
      model = response.model
    }

    const parsed = parseAiOutput(raw)
    if (!parsed.ok) throw new Error(parsed.error)

    await useDb().transaction(async (tx) => {
      await tx
        .update(briefs)
        .set({
          aiStatus: 'completed',
          aiResult: parsed.data,
          serviceCategory: parsed.data.service_category,
          priority: parsed.data.priority,
          aiError: null,
          aiProcessedAt: new Date(),
        })
        .where(eq(briefs.id, brief.id))
      await tx.insert(aiRuns).values({
        briefId: brief.id,
        status: 'success',
        model,
        rawOutput: raw,
        latencyMs: Date.now() - started,
      })
    })
    return 'completed'
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await markFailed(brief.id, { message, raw, model, latencyMs: Date.now() - started })
    return 'failed'
  }
}

async function callWithOneRetry(config: LlmConfig, userMessage: string) {
  const request = { system: ANALYSIS_SYSTEM_PROMPT, user: userMessage, maxTokens: 800 }
  try {
    return await callLlm(config, request)
  }
  catch (error) {
    if (!(error instanceof TransientLlmError)) throw error
    await new Promise(resolve => setTimeout(resolve, RETRY_BACKOFF_MS))
    return callLlm(config, request)
  }
}

async function markFailed(
  briefId: string,
  f: { message: string, raw: string | null, model: string, latencyMs: number },
) {
  try {
    await useDb().transaction(async (tx) => {
      // The latest run decides the stored state, so a failed re-run clears the old result.
      await tx
        .update(briefs)
        .set({
          aiStatus: 'failed',
          aiError: f.message,
          aiResult: null,
          serviceCategory: null,
          priority: null,
          aiProcessedAt: new Date(),
        })
        .where(eq(briefs.id, briefId))
      await tx.insert(aiRuns).values({
        briefId,
        status: 'failed',
        model: f.model,
        rawOutput: f.raw,
        error: f.message,
        latencyMs: f.latencyMs,
      })
    })
  }
  catch (dbError) {
    // If even this fails the row stays `processing`; recoverStuckBriefs() will retry it.
    console.error(`[ai] could not mark brief ${briefId} as failed:`, dbError)
  }
}
