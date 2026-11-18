import { BriefIdParamSchema, UpdatePipelineStatusSchema } from '#shared/schemas/admin'
import { updatePipelineStatus } from '../../../../services/brief.service'

export default defineEventHandler(async (event) => {
  const { id } = parseParams(event, BriefIdParamSchema)
  const { pipelineStatus } = await parseBody(event, UpdatePipelineStatusSchema)
  const user = getAdminUser(event)
  return updatePipelineStatus(id, pipelineStatus, user.id)
})
