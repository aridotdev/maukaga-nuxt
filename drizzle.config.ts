import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/utils/admin-cache/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: '.data/admin-cache.sqlite'
  }
})
