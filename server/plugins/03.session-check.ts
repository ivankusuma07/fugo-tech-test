/**
 * Validate the session whenever the app reads it (/api/_auth/session, used by
 * useUserSession on SSR and on login). A session whose user no longer exists is
 * cleared, so `loggedIn` is false and the /admin page middleware redirects to /login
 * instead of rendering an empty dashboard.
 */
export default defineNitroPlugin(() => {
  sessionHooks.hook('fetch', async (session, event) => {
    const user = await findSessionUser(session.user)
    if (!user) {
      await clearUserSession(event)
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Sesi tidak valid.' })
    }
  })
})
