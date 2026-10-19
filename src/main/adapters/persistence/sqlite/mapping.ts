/**
 * Value mapping helpers between SQLite rows and the domain entities. They
 * mirror the package-level helpers of the Go adapter (joinCSV, splitCSV and
 * the datetime parsing done while mapping rows).
 */

/** Serializes titles/tags into the storage CSV format. */
export function joinCsv(values: string[]): string {
  return values.join(',')
}

/**
 * Parses the stored CSV: trims the entries and drops the empty ones. It never
 * returns undefined, so an empty list travels as an empty list rather than as
 * a null (ADR-0005).
 */
export function splitCsv(value: string): string[] {
  if (value === '') {
    return []
  }
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
}

/**
 * Converts a storage timestamp (`datetime('now')`, `YYYY-MM-DD HH:MM:SS` in
 * UTC) to ISO 8601. An unparsable value throws, mirroring the Go parse error.
 */
export function parseDatabaseTime(value: string): string {
  const parsed = new Date(`${value.replace(' ', 'T')}Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`invalid database timestamp: ${value}`)
  }
  return parsed.toISOString()
}

/**
 * True for SQLite UNIQUE constraint violations (SQLITE_CONSTRAINT_UNIQUE). The
 * check is structural on `code` because errors created by the native addon do
 * not satisfy `instanceof` across Jest's sandboxed contexts.
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'SQLITE_CONSTRAINT_UNIQUE'
  )
}
