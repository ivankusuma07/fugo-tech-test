import { and, count, desc, eq, sql } from 'drizzle-orm'
import type { Priority, ServiceCategory } from '#shared/constants'
import type { BriefInput } from '#shared/schemas/brief-input'
import { briefs, pipelineStatusHistory } from '../db/schema'

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
