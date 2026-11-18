import { describe, expect, it } from 'vitest'
import { parseAiOutput } from '../../server/lib/ai-output'

const valid = {
  summary: 'Website company profile dan katalog produk kopi.',
  service_category: 'Website',
  priority: 'High',
  priority_reason: 'Scope jelas dan timeline kurang dari 30 hari.',
  missing_info: ['Status domain dan hosting.'],
}

describe('parseAiOutput', () => {
  it('accepts a valid result', () => {
    const r = parseAiOutput(JSON.stringify(valid))
    expect(r).toEqual({ ok: true, data: valid })
  })

  it('accepts an empty missing_info list', () => {
    expect(parseAiOutput(JSON.stringify({ ...valid, missing_info: [] })).ok).toBe(true)
  })

  it('rejects text that is not JSON', () => {
    const r = parseAiOutput('Berikut analisisnya: {"summary": ...')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/bukan JSON valid/)
  })

  it('rejects a priority outside the enum (e.g. "Urgent")', () => {
    const r = parseAiOutput(JSON.stringify({ ...valid, priority: 'Urgent' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/priority/)
  })

  it('rejects a category with the wrong spelling', () => {
    expect(parseAiOutput(JSON.stringify({ ...valid, service_category: 'website' })).ok).toBe(false)
  })

  it('rejects extra keys (strict object)', () => {
    expect(parseAiOutput(JSON.stringify({ ...valid, confidence: 0.9 })).ok).toBe(false)
  })

  it('rejects a missing field', () => {
    const { summary: _omit, ...rest } = valid
    const r = parseAiOutput(JSON.stringify(rest))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/summary/)
  })

  it('rejects missing_info that is not an array of strings', () => {
    expect(parseAiOutput(JSON.stringify({ ...valid, missing_info: 'domain' })).ok).toBe(false)
  })

  it('rejects a JSON array or null at the root', () => {
    expect(parseAiOutput('[]').ok).toBe(false)
    expect(parseAiOutput('null').ok).toBe(false)
  })
})
