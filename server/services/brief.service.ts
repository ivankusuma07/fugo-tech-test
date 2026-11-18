import { and, count, desc, eq, inArray, sql } from 'drizzle-orm'
import {
  canTransition,
  PIPELINE_LABELS,
  PIPELINE_TRANSITIONS,
  type PipelineStatus,
  type Priority,
  type ServiceCategory,
} from '#shared/constants'
import type { BriefInput } from '#shared/schemas/brief-input'
import { aiRuns, briefs, pipelineStatusHistory, users } from '../db/schema'

/**
 * Saves the brief first, always. AI processing happens afterwards in the
 * background worker, so an LLM outage can never lose a submission.
 */
export async function createBrief(input: BriefInput) {
  return useDb().transaction(async (tx) => {
    const [brief] = await tx
      .insert(briefs)
      .values({ ...input, aiStatus: 'pending', pipelineStatus: 'new' })
      .returning({ id: briefs.id, number: briefs.number })

    // First history row: created as "new" by the system (changedBy = null).
    await tx.insert(pipelineStatusHistory).values({
      briefId: brief!.id,
      fromStatus: null,
      toStatus: 'new',
      changedBy: null,
    })

    return brief!
  })
}

export interface BriefListFilters {
  priority?: Priority
  category?: ServiceCategory
  page: number
  pageSize: number
}

/** Newest first, optionally filtered by priority and/or category (both indexed columns). */
export async function listBriefs({ priority, category, page, pageSize }: BriefListFilters) {
  const db = useDb()
  const where = and(
    priority ? eq(briefs.priority, priority) : undefined,
    category ? eq(briefs.serviceCategory, category) : undefined,
  )

  const [items, [{ total } = { total: 0 }]] = await Promise.all([
    db
      .select({
        id: briefs.id,
        number: briefs.number,
        name: briefs.name,
        companyName: briefs.companyName,
        serviceCategory: briefs.serviceCategory,
        priority: briefs.priority,
        aiStatus: briefs.aiStatus,
        pipelineStatus: briefs.pipelineStatus,
        createdAt: briefs.createdAt,
      })
      .from(briefs)
      .where(where)
      .orderBy(desc(briefs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(briefs).where(where),
  ])

  return { items, total, page, pageSize }
}

/** Headline numbers for the dashboard, across all briefs (not affected by filters). */
export async function getBriefStats() {
  const [row] = await useDb()
    .select({
      total: count(),
      high: count(sql`case when ${briefs.priority} = 'High' then 1 end`),
      notContacted: count(sql`case when ${briefs.pipelineStatus} = 'new' then 1 end`),
      aiFailed: count(sql`case when ${briefs.aiStatus} = 'failed' then 1 end`),
    })
    .from(briefs)
  return row!
}

export async function getBriefDetail(id: string) {
  const db = useDb()
  const brief = await db.query.briefs.findFirst({ where: eq(briefs.id, id) })
  if (!brief) throw notFound()

  const [runs, history] = await Promise.all([
    db
      .select()
      .from(aiRuns)
      .where(eq(aiRuns.briefId, id))
      .orderBy(desc(aiRuns.createdAt))
      .limit(10),
    db
      .select({
        id: pipelineStatusHistory.id,
        fromStatus: pipelineStatusHistory.fromStatus,
        toStatus: pipelineStatusHistory.toStatus,
        changedByEmail: users.email, // null = system
        createdAt: pipelineStatusHistory.createdAt,
      })
      .from(pipelineStatusHistory)
      .leftJoin(users, eq(users.id, pipelineStatusHistory.changedBy))
      .where(eq(pipelineStatusHistory.briefId, id))
      .orderBy(desc(pipelineStatusHistory.createdAt)),
  ])

  return { brief, aiRuns: runs, history }
}

/**
 * Moves the brief one step forward in the pipeline and records who did it.
 * The row lock makes the check-then-write safe against double clicks / two tabs.
 */
export async function updatePipelineStatus(id: string, to: PipelineStatus, userId: string) {
  return useDb().transaction(async (tx) => {
    const [current] = await tx
      .select({ pipelineStatus: briefs.pipelineStatus })
      .from(briefs)
      .where(eq(briefs.id, id))
      .for('update')
    if (!current) throw notFound()

    const from = current.pipelineStatus
    if (!canTransition(from, to)) {
      const allowed = PIPELINE_TRANSITIONS[from].map(s => PIPELINE_LABELS[s]).join(' / ')
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: allowed
          ? `Status tidak bisa diubah dari ${PIPELINE_LABELS[from]} ke ${PIPELINE_LABELS[to]}. Langkah berikutnya: ${allowed}.`
          : `Status ${PIPELINE_LABELS[from]} sudah final dan tidak bisa diubah.`,
      })
    }

    await tx.update(briefs).set({ pipelineStatus: to }).where(eq(briefs.id, id))
    const [entry] = await tx
      .insert(pipelineStatusHistory)
      .values({ briefId: id, fromStatus: from, toStatus: to, changedBy: userId })
      .returning()

    return { pipelineStatus: to, historyEntry: entry! }
  })
}

/** Sends a finished (completed or failed) brief back to the AI queue. */
export async function requeueBrief(id: string) {
  const db = useDb()
  const [row] = await db
    .update(briefs)
    .set({ aiStatus: 'pending', aiError: null })
    .where(and(eq(briefs.id, id), inArray(briefs.aiStatus, ['completed', 'failed'])))
    .returning({ id: briefs.id, aiStatus: briefs.aiStatus })
  if (row) return row

  const exists = await db.query.briefs.findFirst({ where: eq(briefs.id, id), columns: { id: true } })
  if (!exists) throw notFound()
  throw createError({
    statusCode: 409,
    statusMessage: 'Conflict',
    message: 'Brief ini sedang menunggu atau sedang diproses AI.',
  })
}

function notFound() {
  return createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Brief tidak ditemukan.' })
}
