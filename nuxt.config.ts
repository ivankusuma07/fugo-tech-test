import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', 'nuxt-auth-utils'],
  devtools: { enabled: true },
  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      title: 'Fugo Brief Inbox',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Inter:wght@400;500;600&display=swap',
        },
      ],
    },
  },
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2026-11-01',
  vite: {
    plugins: [tailwindcss()],
  },
  eslint: {
    config: { stylistic: true },
  },
})
