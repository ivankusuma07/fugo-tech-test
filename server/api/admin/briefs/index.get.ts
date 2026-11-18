import { BriefListQuerySchema } from '#shared/schemas/admin'
import { getBriefStats, listBriefs } from '../../../services/brief.service'

export default defineEventHandler(async (event) => {
  const query = parseQuery(event, BriefListQuerySchema)
  const [list, stats] = await Promise.all([listBriefs(query), getBriefStats()])
  return { ...list, stats }
})
