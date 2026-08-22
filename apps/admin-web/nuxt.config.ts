import { createPublicAppBuildInfo } from '../../config/app-version'

const publicAppBuildInfo = createPublicAppBuildInfo()

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
  },
  runtimeConfig: {
    public: {
      ...publicAppBuildInfo,
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'Mau KaGa'
    }
  }
})
