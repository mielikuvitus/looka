export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  ui: { colorMode: false },
  compatibilityDate: '2026-07-01',
  components: [{ path: '~/components', pathPrefix: false }],
  app: {
    head: {
      title: 'Claimsboard',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/icon.svg' },
      ],
    },
  },
})
