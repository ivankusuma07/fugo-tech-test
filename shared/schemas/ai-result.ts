import { z } from 'zod'
import { PRIORITIES, SERVICE_CATEGORIES } from '../constants'

/**
 * The exact JSON shape the LLM must return. Anything else (extra keys,
 * wrong enum spelling, empty summary) fails validation and the brief is
 * marked ai_status = 'failed'. Nothing unvalidated is ever stored as a result.
 */
export const AiResultSchema = z.strictObject({
  summary: z.string().trim().min(10).max(600),
  service_category: z.enum(SERVICE_CATEGORIES),
  priority: z.enum(PRIORITIES),
  priority_reason: z.string().trim().min(5).max(400),
  missing_info: z.array(z.string().trim().min(1).max(300)).max(10),
})

export type AiResult = z.infer<typeof AiResultSchema>
