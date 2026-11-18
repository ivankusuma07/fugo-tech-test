import { BriefIdParamSchema } from '#shared/schemas/admin'
import { getBriefDetail } from '../../../services/brief.service'

export default defineEventHandler(async (event) => {
  const { id } = parseParams(event, BriefIdParamSchema)
  return getBriefDetail(id)
})
