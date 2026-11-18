import { BriefInputSchema } from '#shared/schemas/brief-input'
import { createBrief } from '../../services/brief.service'

export default defineEventHandler(async (event) => {
  assertRateLimit(event, 'create-brief', 5, 60_000)

  const body = await readBody(event).catch(() => undefined)

  // Honeypot: real users never see or fill the "website" field. Pretend success.
  if (body && typeof body === 'object' && 'website' in body && body.website) {
    setResponseStatus(event, 201)
    return { id: null, number: null }
  }

  const input = validateOrThrow(BriefInputSchema, body)
  const brief = await createBrief(input)

  setResponseStatus(event, 201)
  return brief
})
