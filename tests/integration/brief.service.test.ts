import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { briefs, pipelineStatusHistory, users } from '../../server/db/schema'
import {
  createBrief,
  getBriefDetail,
  listBriefs,
  requeueBrief,
  updatePipelineStatus,
} from '../../server/services/brief.service'
import { INTEGRATION_DATABASE_URL, query, truncateAll } from '../support/test-db'

const db = useDb()
let adminId: string

const input = {
  name: 'Rina',
  email: 'rina@sinarkopi.id',
  companyName: 'PT Sinar Kopi',
  needs: 'Website company profile dan katalog produk kopi.',
  budgetRange: '25m_50m' as const,
  targetDate: '2099-01-01',
}

beforeEach(async () => {
  await truncateAll(INTEGRATION_DATABASE_URL)
  await query(INTEGRATION_DATABASE_URL, 'DELETE FROM users')
  const [u] = await db.insert(users).values({ email: 'admin@fugo.test', passwordHash: 'x' }).returning()
  adminId = u!.id
})

function historyOf(id: string) {
  return db.select().from(pipelineStatusHistory).where(eq(pipelineStatusHistory.briefId, id))
}

describe('createBrief', () => {
  it('saves the brief as pending/new with one system history row', async () => {
    const { id, number } = await createBrief(input)
    expect(number).toBe(1)

    const saved = await db.query.briefs.findFirst({ where: eq(briefs.id, id) })
    expect(saved).toMatchObject({ aiStatus: 'pending', pipelineStatus: 'new' })

    const history = await historyOf(id)
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ fromStatus: null, toStatus: 'new', changedBy: null })
  })
})

describe('updatePipelineStatus', () => {
  it('moves one step forward and records who did it', async () => {
    const { id } = await createBrief(input)
    const r = await updatePipelineStatus(id, 'contacted', adminId)

    expect(r.pipelineStatus).toBe('contacted')
    expect(r.historyEntry).toMatchObject({ fromStatus: 'new', toStatus: 'contacted', changedBy: adminId })
    expect(await historyOf(id)).toHaveLength(2)
  })

  it('rejects a jump with 409 and writes nothing', async () => {
    const { id } = await createBrief(input)
    await expect(updatePipelineStatus(id, 'won', adminId)).rejects.toMatchObject({ statusCode: 409 })

    const saved = await db.query.briefs.findFirst({ where: eq(briefs.id, id) })
    expect(saved!.pipelineStatus).toBe('new')
    expect(await historyOf(id)).toHaveLength(1)
  })

  it('treats won and lost as final', async () => {
    const { id } = await createBrief(input)
    await updatePipelineStatus(id, 'contacted', adminId)
    await updatePipelineStatus(id, 'proposal', adminId)
    await updatePipelineStatus(id, 'lost', adminId)
    await expect(updatePipelineStatus(id, 'won', adminId)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('lets only one of two simultaneous identical changes through', async () => {
    const { id } = await createBrief(input)
    const results = await Promise.allSettled([
      updatePipelineStatus(id, 'contacted', adminId),
      updatePipelineStatus(id, 'contacted', adminId),
    ])
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect(await historyOf(id)).toHaveLength(2)
  })

  it('returns 404 for an unknown brief', async () => {
    await expect(
      updatePipelineStatus('00000000-0000-4000-8000-000000000000', 'contacted', adminId),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('listBriefs', () => {
  it('returns newest first and filters by priority and category together', async () => {
    const a = await createBrief({ ...input, companyName: 'A' })
    const b = await createBrief({ ...input, companyName: 'B' })
    const c = await createBrief({ ...input, companyName: 'C' })
    await db.update(briefs).set({ priority: 'High', serviceCategory: 'Website' }).where(eq(briefs.id, a.id))
    await db.update(briefs).set({ priority: 'High', serviceCategory: 'Branding' }).where(eq(briefs.id, b.id))
    await db.update(briefs).set({ priority: 'Low', serviceCategory: 'Website' }).where(eq(briefs.id, c.id))

    const all = await listBriefs({ page: 1, pageSize: 20 })
    expect(all.items.map(i => i.companyName)).toEqual(['C', 'B', 'A'])

    const high = await listBriefs({ priority: 'High', page: 1, pageSize: 20 })
    expect(high.total).toBe(2)

    const both = await listBriefs({ priority: 'High', category: 'Website', page: 1, pageSize: 20 })
    expect(both.items.map(i => i.companyName)).toEqual(['A'])
  })
})

describe('requeueBrief', () => {
  it('refuses while the brief is still pending', async () => {
    const { id } = await createBrief(input)
    await expect(requeueBrief(id)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('sends a failed brief back to pending', async () => {
    const { id } = await createBrief(input)
    await db.update(briefs).set({ aiStatus: 'failed', aiError: 'boom' }).where(eq(briefs.id, id))

    await requeueBrief(id)
    const { brief } = await getBriefDetail(id)
    expect(brief.aiStatus).toBe('pending')
    expect(brief.aiError).toBeNull()
  })
})
