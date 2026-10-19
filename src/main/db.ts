import { chmodSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '../../adapters/persistence/sqlite/schema'

/** Drizzle client handed over to the repositories. */
export type AppDatabase = BetterSQLite3Database<typeof schema>

/** SQLite special path for in-memory databases. */
const memoryDbPath = ':memory:'

/**
 * Migrations live next to the schema. This relative path resolves both when the
 * module runs from the sources (tests) and when the main process is bundled
 * into `out/main`.
 */
const migrationsFolder = join(__dirname, '../../adapters/persistence/sqlite/migrations')

function applyConnectionPragmas(sqlite: Database.Database): void {
  sqlite.pragma('foreign_keys = ON')
  // WAL requires a file-backed database; it is a no-op for `:memory:`.
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('busy_timeout = 5000')
}

function restrictFilePermissions(dbPath: string): void {
  if (dbPath === memoryDbPath || process.platform === 'win32') {
    return
  }
  try {
    chmodSync(dbPath, 0o600)
  } catch {
    // Best effort: not every filesystem supports POSIX permissions.
  }
}

/**
 * Opens the SQLite database at `dbPath`, applies the connection pragmas, runs
 * the pending migrations and returns the Drizzle client.
 */
export function openDatabase(dbPath: string): AppDatabase {
  const sqlite = new Database(dbPath)
  applyConnectionPragmas(sqlite)
  restrictFilePermissions(dbPath)

  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder })

  return db
}
