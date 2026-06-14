// https://nuxt.com/docs/api/configuration/nuxt-config
const defaultAppsScriptApiUrl = 'https://script.google.com/macros/s/AKfycbxAikXauXo-Ct_FfawqXjrdMxa3K-cK6eyBZFuG74IlrVNW2bE2vwX4BLsEo-CS7AwIyA/exec'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/fonts', '@nuxt/ui', '@nuxt/eslint','@nuxtjs/supabase'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    appsScriptApiUrl: import.meta.env.NUXT_APPS_SCRIPT_API_URL || import.meta.env.NUXT_PUBLIC_APPS_SCRIPT_API_URL || defaultAppsScriptApiUrl,
    public: {
      appsScriptApiUrl: import.meta.env.NUXT_PUBLIC_APPS_SCRIPT_API_URL || defaultAppsScriptApiUrl,
      appName: import.meta.env.NUXT_PUBLIC_APP_NAME || 'Mau KaGa',
      maxUploadMb: Number(import.meta.env.NUXT_PUBLIC_MAX_UPLOAD_MB || 10),
      maxItems: Number(import.meta.env.NUXT_PUBLIC_MAX_ITEMS || 10)
    }
  },
  supabase: {
    redirect: false,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/login', '/confirm', '/403']
    },
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 2, // 2 hari
      sameSite: 'lax',
      secure: true
    }
  },

  routeRules: {
    '/login': { ssr: false },
    '/confirm': { ssr: false },
    '/403': { ssr: false },
    '/dashboard/**': { ssr: false }
  },
  vite: {
    optimizeDeps: {
      include: [
        'zod',
        '@unovis/vue',
        '@vueuse/core',
        'date-fns',
        '@tanstack/table-core'
      ]
    }
  }
})
