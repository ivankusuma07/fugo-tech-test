import { afterEach, describe, expect, it, vi } from 'vitest'
import { BriefInputSchema } from '../../shared/schemas/brief-input'
import { isIsoDate, todayInJakarta } from '../../shared/utils/date'

const base = {
  name: 'Rina',
  email: 'rina@sinarkopi.id',
  companyName: 'PT Sinar Kopi Nusantara',
  needs: 'Website company profile dan katalog produk.',
  budgetRange: '25m_50m',
  targetDate: '2099-01-01',
}

afterEach(() => {
  vi.useRealTimers()
})

describe('todayInJakarta', () => {
  it('is already "tomorrow" in WIB while UTC is still today', () => {
    // 18 Nov 2026 18:30 UTC = 19 Nov 2026 01:30 WIB
    expect(todayInJakarta(new Date('2026-11-18T18:30:00Z'))).toBe('2026-11-19')
  })

  it('matches UTC date in the WIB afternoon', () => {
    expect(todayInJakarta(new Date('2026-11-18T05:00:00Z'))).toBe('2026-11-18')
  })
})

describe('isIsoDate', () => {
  it('accepts real dates and rejects impossible ones', () => {
    expect(isIsoDate('2026-02-28')).toBe(true)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('18/11/2026')).toBe(false)
  })
})

describe('BriefInputSchema', () => {
  it('accepts a valid brief', () => {
    expect(BriefInputSchema.safeParse(base).success).toBe(true)
  })

  it('trims text fields', () => {
    const r = BriefInputSchema.parse({ ...base, name: '  Rina  ' })
    expect(r.name).toBe('Rina')
  })

  it('requires every field', () => {
    const r = BriefInputSchema.safeParse({})
    expect(r.success).toBe(false)
    const fields = r.error!.issues.map(i => i.path[0])
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'companyName', 'needs', 'budgetRange', 'targetDate']))
  })

  it('rejects an invalid email', () => {
    expect(BriefInputSchema.safeParse({ ...base, email: 'rina@' }).success).toBe(false)
  })

  it('rejects an unknown budget range', () => {
    expect(BriefInputSchema.safeParse({ ...base, budgetRange: '1b' }).success).toBe(false)
  })

  it('rejects whitespace-only needs', () => {
    expect(BriefInputSchema.safeParse({ ...base, needs: '          ' }).success).toBe(false)
  })

  describe('target date, judged in WIB', () => {
    it('accepts today in WIB just after midnight WIB (still yesterday in UTC)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-11-18T17:30:00Z')) // 19 Nov 00:30 WIB
      expect(BriefInputSchema.safeParse({ ...base, targetDate: '2026-11-19' }).success).toBe(true)
    })

    it('rejects yesterday (WIB)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-11-18T17:30:00Z')) // 19 Nov 00:30 WIB
      const r = BriefInputSchema.safeParse({ ...base, targetDate: '2026-11-18' })
      expect(r.success).toBe(false)
      expect(r.error!.issues[0]!.message).toBe('Tanggal tidak boleh di masa lalu.')
    })
  })
})
