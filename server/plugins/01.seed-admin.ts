import { eq } from 'drizzle-orm'
import { users } from '../db/schema'

/**
 * Creates the single admin account from ADMIN_EMAIL / ADMIN_PASSWORD on startup,
 * if it does not exist yet. Idempotent; never overwrites an existing password.
 */
export default defineNitroPlugin(async () => {
  if (import.meta.prerender) return
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = useEnv()
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set, skipping admin seed')
    return
  }

  try {
    const db = useDb()
    const existing = await db.query.users.findFirst({ where: eq(users.email, ADMIN_EMAIL) })
    if (existing) return

    await db
      .insert(users)
      .values({ email: ADMIN_EMAIL, passwordHash: await hashPassword(ADMIN_PASSWORD) })
      .onConflictDoNothing()
    console.info(`[seed] admin user ${ADMIN_EMAIL} created`)
  }
  catch (error) {
    console.error('[seed] failed to seed admin user:', error)
  }
})
