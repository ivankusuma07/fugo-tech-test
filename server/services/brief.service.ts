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
