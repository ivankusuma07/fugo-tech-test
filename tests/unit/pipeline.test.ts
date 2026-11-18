import { describe, expect, it } from 'vitest'
import { canTransition, PIPELINE_STATUSES } from '../../shared/constants'

describe('pipeline transitions (forward-only, one step)', () => {
  const allowed = new Set(['new>contacted', 'contacted>proposal', 'proposal>won', 'proposal>lost'])

  for (const from of PIPELINE_STATUSES) {
    for (const to of PIPELINE_STATUSES) {
      const key = `${from}>${to}`
      it(`${allowed.has(key) ? 'allows' : 'rejects'} ${key}`, () => {
        expect(canTransition(from, to)).toBe(allowed.has(key))
      })
    }
  }
})
