/** UI guard: /admin/** pages need a session; /login sends logged-in users to the dashboard. */
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  if (to.path.startsWith('/admin') && !loggedIn.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
  if (to.path === '/login' && loggedIn.value) {
    return navigateTo('/admin')
  }
})
