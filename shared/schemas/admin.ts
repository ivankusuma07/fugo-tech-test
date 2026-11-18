import { z } from 'zod'
import { ADMIN_PAGE_SIZE, PIPELINE_STATUSES, PRIORITIES, SERVICE_CATEGORIES } from '../constants'

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Format email tidak valid.')),
  password: z.string().min(1, 'Password wajib diisi.').max(200),
})

export const BriefListQuerySchema = z.object({
  priority: z.enum(PRIORITIES).optional(),
  category: z.enum(SERVICE_CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(ADMIN_PAGE_SIZE),
})

export const UpdatePipelineStatusSchema = z.object({
  pipelineStatus: z.enum(PIPELINE_STATUSES),
})

export const BriefIdParamSchema = z.object({
  id: z.uuid('ID brief tidak valid.'),
})
