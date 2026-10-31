import { describe, expect, it } from '@jest/globals'
import { registerSettingsHandlers } from './settings-service'
import { settingsChannels } from './contract'
import { defaultPreferences } from '../../../shared/typography'
import type { TypographySnapshot } from '../../../shared/typography'

describe('settings IPC boundary', () => {
  it('merges ordered updates, rejects invalid callers and keeps session state after storage failure', async () => {
    const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>()
    const notifications: TypographySnapshot[] = []
    registerSettingsHandlers(
      {
        handle: (channel, handler) => {
          handlers.set(channel, handler)
        }
      },
      {
        isMain: (event) => event === 'main',
        isSettings: (event) => event === 'settings',
        open: async () => {},
        close: () => {},
        broadcast: (snapshot) => notifications.push(snapshot)
      }
    )
    const call = (channel: string, sender: string, ...args: unknown[]): unknown =>
      handlers.get(channel)!(sender, ...args)
    await expect(call(settingsChannels.get, 'main', defaultPreferences)).resolves.toMatchObject({
      ok: true,
      value: { revision: 0 }
    })
    await expect(
      call(settingsChannels.patch, 'stranger', { context: 'editor', changes: { size: 24 } })
    ).resolves.toMatchObject({ ok: false, error: { code: 'errForbidden' } })
    await expect(
      call(settingsChannels.patch, 'settings', {
        context: 'interface',
        changes: { lineHeight: 1.5 }
      })
    ).resolves.toMatchObject({ ok: false, error: { code: 'errInvalidPayload' } })
    await expect(
      call(settingsChannels.patch, 'settings', { context: 'editor', changes: { lineHeight: 0 } })
    ).resolves.toMatchObject({ ok: false })
    await call(settingsChannels.patch, 'settings', { context: 'editor', changes: { size: 24 } })
    await call(settingsChannels.patch, 'settings', {
      context: 'editor',
      changes: { lineHeight: 1.5 }
    })
    await call(settingsChannels.storage, 'main', 2, true)
    await call(settingsChannels.storage, 'main', 1, false)
    await expect(call(settingsChannels.get, 'settings')).resolves.toMatchObject({
      ok: true,
      value: {
        revision: 3,
        storageError: true,
        preferences: {
          editor: { font: 'Fira Code', size: 24, lineHeight: 1.5 },
          preview: { lineHeight: 2 }
        }
      }
    })
    expect(notifications).toHaveLength(3)
    await expect(call(settingsChannels.storage, 'settings', 2, false)).resolves.toMatchObject({
      ok: false,
      error: { code: 'errForbidden' }
    })
    await expect(call(settingsChannels.close, 'main')).resolves.toMatchObject({ ok: false })
  })
})
