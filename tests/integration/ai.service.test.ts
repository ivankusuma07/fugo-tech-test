import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { aiRuns, briefs } from '../../server/db/schema'
import { PermanentLlmError, TransientLlmError } from '../../server/lib/llm'
import {
  claimPendingBriefs,
  processBrief,
  recoverStuckBriefs,
  STUCK_AFTER_MS,
} from '../../server/services/ai.service'
import { createBrief } from '../../server/services/brief.service'
import { testEnv } from '../support/nitro-globals'
import { INTEGRATION_DATABASE_URL, truncateAll } from '../support/test-db'

// Keep the real error classes, replace only the network call.
vi.mock('../../server/lib/llm', async importOriginal => ({
  ...(await importOriginal<typeof import('../../server/lib/llm')>()),
  callLlm: vi.fn(),
}))
const { callLlm } = await import('../../server/lib/llm')
const mockedCall = vi.mocked(callLlm)

const db = useDb()
const validOutput = JSON.stringify({
  summary: 'Website company profile dan katalog produk kopi.',
  service_category: 'Website',
  priority: 'High',
  priority_reason: 'Scope jelas dan timeline kurang dari 30 hari.',
  missing_info: ['Status domain dan hosting.'],
})

const input = {
  name: 'Rina',
  email: 'rina@sinarkopi.id',
  companyName: 'PT Sinar Kopi',
  needs: 'Website company profile dan katalog produk kopi.',
  budgetRange: '25m_50m' as const,
  targetDate: '2099-01-01',
}

async function newClaimedBrief() {
  await createBrief(input)
  const [claimed] = await claimPendingBriefs(1)
  return claimed!
}

async function reload(id: string) {
  const brief = await db.query.briefs.findFirst({ where: eq(briefs.id, id) })
  const runs = await db.select().from(aiRuns).where(eq(aiRuns.briefId, id))
  return { brief: brief!, runs }
}

beforeEach(async () => {
  await truncateAll(INTEGRATION_DATABASE_URL)
  mockedCall.mockReset()
  testEnv.AI_FORCE_FAIL = false
  testEnv.LLM_API_KEY = 'test-key'
})

describe('processBrief', () => {
  it('stores a valid result and copies category/priority to columns', async () => {
    mockedCall.mockResolvedValue({ content: validOutput, model: 'deepseek-flash' })
    const brief = await newClaimedBrief()

    expect(await processBrief(brief)).toBe('completed')

    const { brief: saved, runs } = await reload(brief.id)
    expect(saved.aiStatus).toBe('completed')
    expect(saved.serviceCategory).toBe('Website')
    expect(saved.priority).toBe('High')
    expect(saved.aiResult?.summary).toMatch(/katalog/)
    expect(saved.aiError).toBeNull()
    expect(runs).toHaveLength(1)
    expect(runs[0]!.status).toBe('success')
  })

  it('marks failed and keeps the raw output when the model returns non-JSON', async () => {
    mockedCall.mockResolvedValue({ content: 'Tentu! Berikut analisisnya...', model: 'deepseek-flash' })
    const brief = await newClaimedBrief()

    expect(await processBrief(brief)).toBe('failed')

    const { brief: saved, runs } = await reload(brief.id)
    expect(saved.aiStatus).toBe('failed')
    expect(saved.aiError).toMatch(/bukan JSON/)
    expect(saved.aiResult).toBeNull()
    expect(runs[0]!.status).toBe('failed')
    expect(runs[0]!.rawOutput).toBe('Tentu! Berikut analisisnya...')
  })

  it('marks failed when the JSON does not match the schema (wrong enum)', async () => {
    mockedCall.mockResolvedValue({
      content: JSON.stringify({ ...JSON.parse(validOutput), priority: 'Urgent' }),
      model: 'deepseek-flash',
    })
    const brief = await newClaimedBrief()

    expect(await processBrief(brief)).toBe('failed')
    const { brief: saved } = await reload(brief.id)
    expect(saved.aiError).toMatch(/validasi schema.*priority/)
    expect(saved.priority).toBeNull()
  })

  it('does not retry a timeout and marks the brief failed', async () => {
    mockedCall.mockRejectedValue(new PermanentLlmError('LLM timeout (20 dtk).'))
    const brief = await newClaimedBrief()

    expect(await processBrief(brief)).toBe('failed')
    expect(mockedCall).toHaveBeenCalledTimes(1)
    const { brief: saved } = await reload(brief.id)
    expect(saved.aiError).toBe('LLM timeout (20 dtk).')
  })

  it('retries a transient error once and then succeeds', async () => {
    mockedCall
      .mockRejectedValueOnce(new TransientLlmError('LLM API error 503: overloaded'))
      .mockResolvedValueOnce({ content: validOutput, model: 'deepseek-flash' })
    const brief = await newClaimedBrief()

    expect(await processBrief(brief)).toBe('completed')
    expect(mockedCall).toHaveBeenCalledTimes(2)
  })

  it('fails after the single retry if the transient error persists', async () => {
    mockedCall.mockRejectedValue(new TransientLlmError('LLM API error 429: rate limited'))
    const brief = await newClaimedBrief()

    expect(await processBrief(brief)).toBe('failed')
    expect(mockedCall).toHaveBeenCalledTimes(2)
  })

  it('fails clearly when no API key is configured', async () => {
    testEnv.LLM_API_KEY = ''
    const brief = await newClaimedBrief()

    expect(await processBrief(brief)).toBe('failed')
    expect(mockedCall).not.toHaveBeenCalled()
    const { brief: saved } = await reload(brief.id)
    expect(saved.aiError).toMatch(/LLM_API_KEY/)
  })

  it('AI_FORCE_FAIL produces a schema failure without calling the LLM', async () => {
    testEnv.AI_FORCE_FAIL = true
    const brief = await newClaimedBrief()

    expect(await processBrief(brief)).toBe('failed')
    expect(mockedCall).not.toHaveBeenCalled()
    const { brief: saved } = await reload(brief.id)
    expect(saved.aiError).toMatch(/priority/)
  })

  it('a failed re-run clears an earlier result', async () => {
    mockedCall.mockResolvedValueOnce({ content: validOutput, model: 'deepseek-flash' })
    const brief = await newClaimedBrief()
    await processBrief(brief)

    await db.update(briefs).set({ aiStatus: 'pending' }).where(eq(briefs.id, brief.id))
    const [again] = await claimPendingBriefs(1)
    mockedCall.mockResolvedValueOnce({ content: '{}', model: 'deepseek-flash' })
    await processBrief(again!)

    const { brief: saved, runs } = await reload(brief.id)
    expect(saved.aiStatus).toBe('failed')
    expect(saved.aiResult).toBeNull()
    expect(saved.priority).toBeNull()
    expect(saved.aiAttempts).toBe(2)
    expect(runs).toHaveLength(2)
  })
})

describe('queue', () => {
  it('two concurrent claims never return the same brief', async () => {
    for (let i = 0; i < 4; i++) {
      await createBrief({ ...input, companyName: 'C' + i })
    }
    const [a, b] = await Promise.all([claimPendingBriefs(3), claimPendingBriefs(3)])
    const claimed = [...a, ...b]
    expect(claimed).toHaveLength(4)
    expect(new Set(claimed.map(x => x.id)).size).toBe(4)
    expect(claimed.every(x => x.aiStatus === 'processing' && x.aiAttempts === 1)).toBe(true)
  })

  it('puts briefs stuck in processing back to pending', async () => {
    const brief = await newClaimedBrief()
    await db
      .update(briefs)
      .set({ aiStartedAt: new Date(Date.now() - STUCK_AFTER_MS - 1000) })
      .where(eq(briefs.id, brief.id))

    expect(await recoverStuckBriefs()).toBe(1)
    const { brief: saved } = await reload(brief.id)
    expect(saved.aiStatus).toBe('pending')
  })

  it('leaves recently started jobs alone', async () => {
    await newClaimedBrief()
    expect(await recoverStuckBriefs()).toBe(0)
  })
})
