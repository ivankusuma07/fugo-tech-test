import { BriefIdParamSchema } from '#shared/schemas/admin'
import { generateEmailDraft } from '../../../../services/ai.service'

export default defineEventHandler(async (event) => {
  const { id } = parseParams(event, BriefIdParamSchema)
  assertRateLimit(event, 'email-draft', 10, 60_000)
  return { emailDraft: await generateEmailDraft(id) }
})
