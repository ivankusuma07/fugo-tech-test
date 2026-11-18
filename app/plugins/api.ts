/**
 * `$api`: $fetch for the admin API. When the server answers 401 (session expired,
 * cookie cleared, user removed) the admin is sent back to the login page instead
 * of seeing a broken dashboard.
 */
export default defineNuxtPlugin((nuxtApp) => {
  // During SSR, forward the browser's cookie like useFetch's default fetch does.
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  const api = $fetch.create({
    headers,
    async onResponseError({ response }) {
      if (response.status !== 401) return
      const route = nuxtApp.$router.currentRoute.value
      if (route.path === '/login') return
      await nuxtApp.runWithContext(async () => {
        if (import.meta.client) await useUserSession().clear()
        await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
      })
    },
  })

  return { provide: { api } }
})
