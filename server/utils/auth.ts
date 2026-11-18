import type { H3Event } from 'h3'
import type { User } from '#auth-utils'

/** The admin user, already verified by server/middleware/admin-auth.ts. */
export function getAdminUser(event: H3Event): User {
  const user = event.context.user as User | undefined
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Silakan login terlebih dahulu.' })
  return user
}
