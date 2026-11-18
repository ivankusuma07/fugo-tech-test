import { z } from 'zod'
import { BUDGET_RANGES, NEEDS_MAX_LENGTH } from '../constants'
import { isIsoDate, todayInJakarta } from '../utils/date'

/**
 * Public brief form. Used by the form (instant feedback) and by
 * POST /api/briefs (the authority). Messages are shown to end users.
 */
export const BriefInputSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi.').max(120, 'Nama terlalu panjang.'),
  email: z
    .string()
    .trim()
    .min(1, 'Email wajib diisi.')
    .max(200, 'Email terlalu panjang.')
    .pipe(z.email('Format email tidak valid.')),
  companyName: z
    .string()
    .trim()
    .min(1, 'Nama perusahaan wajib diisi.')
    .max(200, 'Nama perusahaan terlalu panjang.'),
  needs: z
    .string()
    .trim()
    .min(10, 'Ceritakan kebutuhanmu minimal 10 karakter.')
    .max(NEEDS_MAX_LENGTH, `Maksimal ${NEEDS_MAX_LENGTH} karakter.`),
  budgetRange: z.enum(BUDGET_RANGES, 'Pilih salah satu budget.'),
  targetDate: z
    .string('Tanggal wajib diisi.')
    .min(1, 'Tanggal wajib diisi.')
    .refine(isIsoDate, 'Format tanggal tidak valid.')
    // Compared as YYYY-MM-DD strings, against today in WIB (not server UTC).
    .refine(v => v >= todayInJakarta(), 'Tanggal tidak boleh di masa lalu.'),
})

export type BriefInput = z.infer<typeof BriefInputSchema>
