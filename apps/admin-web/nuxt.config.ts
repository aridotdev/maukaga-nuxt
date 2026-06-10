export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: true,
  extends: ['../../packages/shared'],
  modules: [
    '@nuxt/fonts',
    '@nuxt/ui',
    '@nuxt/eslint'
  ],
  nitro: {
    preset: 'node-server'
  }
})
