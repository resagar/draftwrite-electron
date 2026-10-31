import type { IpcHandlerRegistry } from './contract'
import { settingsChannels } from './contract'
import { toIpcResult } from './errors'
import { applyTypographyPatch, normalizePreferences } from '../../../shared/typography'
import type { TypographySnapshot } from '../../../shared/typography'

export type SettingsPlatform = {
  isMain(event: unknown): boolean
  isSettings(event: unknown): boolean
  open(): Promise<void>
  close(): void
  broadcast(snapshot: TypographySnapshot): void
}

function forbidden(): never {
  throw { code: 'errForbidden', message: 'This frame cannot access settings' }
}
function invalid(): never {
  throw { code: 'errInvalidPayload', message: 'Invalid settings request' }
}

/** One ordered session shared by the two authorized renderers. Only the main renderer persists it. */
export function registerSettingsHandlers(
  ipc: IpcHandlerRegistry,
  platform: SettingsPlatform
): void {
  let current: TypographySnapshot | null = null
  const snapshot = (): TypographySnapshot => {
    if (current === null) throw { code: 'errNotReady', message: 'Settings are not initialized' }
    return current
  }
  const trusted = (event: unknown): void => {
    if (!platform.isMain(event) && !platform.isSettings(event)) forbidden()
  }
  ipc.handle(settingsChannels.open, (event) =>
    toIpcResult(async () => {
      if (!platform.isMain(event)) forbidden()
      snapshot()
      await platform.open()
      platform.broadcast(snapshot())
    })
  )
  ipc.handle(settingsChannels.close, (event) =>
    toIpcResult(async () => {
      if (!platform.isSettings(event)) forbidden()
      platform.close()
    })
  )
  ipc.handle(settingsChannels.get, (event, initial) =>
    toIpcResult(async () => {
      trusted(event)
      if (initial !== undefined && !platform.isMain(event)) forbidden()
      if (current === null && platform.isMain(event))
        current = { preferences: normalizePreferences(initial), revision: 0, storageError: false }
      return snapshot()
    })
  )
  ipc.handle(settingsChannels.patch, (event, update) =>
    toIpcResult(async () => {
      trusted(event)
      const previous = snapshot()
      let preferences
      try {
        preferences = applyTypographyPatch(previous.preferences, update)
      } catch {
        return invalid()
      }
      current = { preferences, revision: previous.revision + 1, storageError: false }
      platform.broadcast(current)
      return current
    })
  )
  ipc.handle(settingsChannels.storage, (event, revision, failed) =>
    toIpcResult(async () => {
      if (!platform.isMain(event)) forbidden()
      if (!Number.isSafeInteger(revision) || typeof failed !== 'boolean') invalid()
      if (snapshot().revision !== revision || snapshot().storageError === failed) return
      current = { ...snapshot(), revision: snapshot().revision + 1, storageError: failed }
      platform.broadcast(current)
    })
  )
}
