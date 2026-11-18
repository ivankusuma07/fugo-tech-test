/**
 * API-level guard: every /api/admin/** request needs a valid session,
 * independent of the page middleware (which only protects the UI).
 */
export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0]!
  if (path !== '/api/admin' && !path.startsWith('/api/admin/')) return

  const session = await getUserSession(event)
  if (!session.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Silakan login terlebih dahulu.',
    })
  }
  event.context.user = session.user
})
