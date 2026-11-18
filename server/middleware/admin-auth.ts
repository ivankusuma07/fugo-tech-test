/**
 * API-level guard: every /api/admin/** request needs a valid, unexpired session
 * whose user still exists, independent of the page middleware (which only protects the UI).
 */
export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0]!
  if (path !== '/api/admin' && !path.startsWith('/api/admin/')) return

  const session = await getUserSession(event)
  const user = await findSessionUser(session.user)

  if (!user) {
    if (session.user) await clearUserSession(event) // stale session: user no longer exists
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Silakan login terlebih dahulu.',
    })
  }
  event.context.user = user
})
