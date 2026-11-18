import { eq } from 'drizzle-orm'
import { LoginSchema } from '#shared/schemas/admin'
import { users } from '../../db/schema'

export default defineEventHandler(async (event) => {
  assertRateLimit(event, 'login', 10, 5 * 60_000)

  const { email, password } = await readValidated(event, LoginSchema)
  const user = await useDb().query.users.findFirst({ where: eq(users.email, email) })

  // Same message for unknown email and wrong password.
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Email atau password salah.',
    })
  }

  await setUserSession(event, { user: { id: user.id, email: user.email } })
  return { user: { id: user.id, email: user.email } }
})
