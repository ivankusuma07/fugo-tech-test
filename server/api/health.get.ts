import { sql } from 'drizzle-orm'

/** Liveness + DB check, used by the Railway health check. */
export default defineEventHandler(async () => {
  await useDb().execute(sql`select 1`)
  return { ok: true }
})
