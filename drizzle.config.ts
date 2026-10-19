import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/adapters/persistence/sqlite/schema.ts',
  out: './src/main/adapters/persistence/sqlite/migrations'
})
