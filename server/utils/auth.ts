import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import type { User } from '#auth-utils'
import { users } from '../db/schema'

/**
 * The user a session points to, if it still exists. A sealed cookie stays valid
 * on its own, so this check is what makes a removed (or re-seeded) user lose access.
 */
export async function findSessionUser(sessionUser: User | undefined): Promise<User | undefined> {
  if (!sessionUser?.id) return undefined
  return useDb().query.users.findFirst({
    where: eq(users.id, sessionUser.id),
    columns: { id: true, email: true },
  })
}

/** The admin user, already verified by server/middleware/admin-auth.ts. */
export function getAdminUser(event: H3Event): User {
  const user = event.context.user as User | undefined
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Silakan login terlebih dahulu.' })
  return user
}
