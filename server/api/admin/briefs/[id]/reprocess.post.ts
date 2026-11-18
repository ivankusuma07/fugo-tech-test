import { BriefIdParamSchema } from '#shared/schemas/admin'
import { nudgeAiWorker } from '../../../../services/ai-worker'
import { requeueBrief } from '../../../../services/brief.service'

export default defineEventHandler(async (event) => {
  const { id } = parseParams(event, BriefIdParamSchema)
  const brief = await requeueBrief(id)
  nudgeAiWorker()
  setResponseStatus(event, 202)
  return brief
})
