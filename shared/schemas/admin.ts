import { z } from 'zod'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, PIPELINE_STATUSES, PRIORITIES, SERVICE_CATEGORIES } from '../constants'

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Format email tidak valid.')),
  password: z.string().min(1, 'Password wajib diisi.').max(200),
})

export const BriefListQuerySchema = z.object({
  priority: z.enum(PRIORITIES).optional(),
  category: z.enum(SERVICE_CATEGORIES).optional(),
  pipeline: z.enum(PIPELINE_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  // 'all' becomes null: no limit.
  pageSize: z.enum(PAGE_SIZE_OPTIONS).default(DEFAULT_PAGE_SIZE).transform(v => (v === 'all' ? null : Number(v))),
})

export const UpdatePipelineStatusSchema = z.object({
  pipelineStatus: z.enum(PIPELINE_STATUSES),
})

export const BriefIdParamSchema = z.object({
  id: z.uuid('ID brief tidak valid.'),
})
