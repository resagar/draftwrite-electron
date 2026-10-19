import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './adapters/persistence/sqlite/schema.ts',
  out: './adapters/persistence/sqlite/migrations'
})
