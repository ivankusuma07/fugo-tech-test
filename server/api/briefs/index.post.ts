import { BriefInputSchema } from '#shared/schemas/brief-input'
import { nudgeAiWorker } from '../../services/ai-worker'
import { createBrief } from '../../services/brief.service'

export default defineEventHandler(async (event) => {
  assertRateLimit(event, 'create-brief', useEnv().BRIEF_RATE_LIMIT_PER_MINUTE, 60_000)

  const body = await readBody(event).catch(() => undefined)

  // Honeypot: real users never see or fill the "website" field. Pretend success.
  if (body && typeof body === 'object' && 'website' in body && body.website) {
    setResponseStatus(event, 201)
    return { id: null, number: null }
  }

  const input = validateOrThrow(BriefInputSchema, body)
  const brief = await createBrief(input)

  // Respond right away; the worker picks the brief up in the background.
  nudgeAiWorker()

  setResponseStatus(event, 201)
  return brief
})
