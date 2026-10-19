import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'

/** Name of the application data directory, shared by every platform. */
export const APP_DIR_NAME = 'draftwrite'

/** Name of the SQLite database file inside the application data directory. */
export const DB_FILE_NAME = 'draftwrite.db'

export interface DataDirOptions {
  /** Platform to resolve for; defaults to `process.platform`. */
  platform?: NodeJS.Platform
  /** Environment to read `XDG_DATA_HOME` from; defaults to `process.env`. */
  env?: NodeJS.ProcessEnv
  /** Home directory used as fallback on Linux; defaults to `os.homedir()`. */
  home?: string
  /** Directory injected by the main process on non-Linux platforms. */
  userData?: string
}

/**
 * Resolves the directory that holds the application data.
 *
 * Linux follows the XDG base directory specification: `$XDG_DATA_HOME/draftwrite`,
 * falling back to `~/.local/share/draftwrite` when the variable is unset, empty
 * or not absolute. Other platforms use the `userData` path injected by the
 * caller (Electron's `app.getPath('userData')`).
 */
export function resolveDataDir(options: DataDirOptions = {}): string {
  const { platform = process.platform, env = process.env, home = homedir(), userData } = options

  if (platform !== 'linux') {
    if (userData === undefined) {
      throw new Error('userData is required to resolve the data directory outside Linux')
    }
    return userData
  }

  const xdgDataHome = env['XDG_DATA_HOME']
  const base =
    xdgDataHome !== undefined && xdgDataHome !== '' && isAbsolute(xdgDataHome)
      ? xdgDataHome
      : join(home, '.local', 'share')

  return join(base, APP_DIR_NAME)
}

/** Resolves the absolute path of the application database file. */
export function resolveDatabasePath(options: DataDirOptions = {}): string {
  return join(resolveDataDir(options), DB_FILE_NAME)
}
