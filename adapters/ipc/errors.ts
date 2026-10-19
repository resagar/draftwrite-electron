import type { IpcError, IpcResult } from './contract'

/** True for domain sentinels: an object whose `code` starts with `err`. */
function isDomainError(error: unknown): error is IpcError {
  if (typeof error !== 'object' || error === null) {
    return false
  }
  return (
    'code' in error &&
    typeof error.code === 'string' &&
    error.code.startsWith('err') &&
    'message' in error &&
    typeof error.message === 'string'
  )
}

/** Best-effort message for a non domain error. */
function messageOf(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message !== ''
  ) {
    return error.message
  }
  return 'unexpected error'
}

/**
 * Maps every thrown value to the boundary error shape. Domain sentinels keep
 * their code and message; anything else becomes `errUnexpected` and is logged
 * (better-sqlite3 codes start with `SQLITE_`, so they land here too).
 */
export function toIpcError(error: unknown): IpcError {
  if (isDomainError(error)) {
    return { code: error.code, message: error.message }
  }
  console.error('unexpected ipc error:', error)
  return { code: 'errUnexpected', message: messageOf(error) }
}

/** Runs a use case and wraps its outcome in the response envelope. */
export async function toIpcResult<T>(operation: () => Promise<T>): Promise<IpcResult<T>> {
  try {
    return { ok: true, value: await operation() }
  } catch (error) {
    return { ok: false, error: toIpcError(error) }
  }
}
