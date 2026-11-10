import { expect, it, jest } from '@jest/globals'
import { registerWindowControls } from './window-controls'
import type { WindowState } from '../../../shared/window-controls'

function harness(
  translucent = true,
  acrylic = false
): {
  invoke: (channel: string, event: unknown, action?: unknown) => unknown
  event: { sender: unknown; senderFrame: { url: string } }
  window: {
    minimize: ReturnType<typeof jest.fn>
    close: ReturnType<typeof jest.fn>
    webContents: { send: ReturnType<typeof jest.fn> }
  }
  emit: (event: string) => void
  handlers: Map<string, (event: unknown, ...args: unknown[]) => unknown>
} {
  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>()
  const listeners = new Map<string, () => void>()
  let maximized = false
  const window = {
    webContents: {
      mainFrame: { url: 'file:///app/index.html' },
      send: jest.fn<(channel: string, state: WindowState) => void>()
    },
    isDestroyed: () => false,
    isMaximized: () => maximized,
    minimize: jest.fn(),
    close: jest.fn(),
    maximize: () => {
      maximized = true
      listeners.get('maximize')?.()
    },
    unmaximize: () => {
      maximized = false
      listeners.get('unmaximize')?.()
    },
    on: (event: string, listener: () => void) => {
      listeners.set(event, listener)
    },
    once: (event: string, listener: () => void) => {
      listeners.set(event, listener)
    },
    removeListener: (event: string) => {
      listeners.delete(event)
    }
  }
  registerWindowControls(
    {
      handle: (channel, listener) => {
        handlers.set(channel, listener)
      },
      removeHandler: (channel) => {
        handlers.delete(channel)
      }
    },
    window,
    'file:///app/index.html',
    translucent,
    acrylic
  )
  return {
    window,
    handlers,
    event: { sender: window.webContents, senderFrame: window.webContents.mainFrame },
    invoke: (channel, event, action) => handlers.get(channel)!(event, action),
    emit: (event) => {
      listeners.get(event)?.()
    }
  }
}

it('rejects settings, subframes, foreign URLs and invalid actions without changing the window', async () => {
  const f = harness()
  for (const event of [
    null,
    {},
    { ...f.event, sender: {} },
    { ...f.event, senderFrame: { url: 'file:///app/index.html' } }
  ])
    expect(await f.invoke('window:execute', event, 'minimize')).toMatchObject({
      ok: false,
      error: { code: 'errForbidden' }
    })
  f.event.senderFrame.url = 'https://foreign.invalid/'
  expect(await f.invoke('window:state', f.event)).toMatchObject({
    ok: false,
    error: { code: 'errForbidden' }
  })
  f.event.senderFrame.url = 'file:///app/index.html'
  for (const action of ['destroy', { action: 'close' }, null, 3])
    expect(await f.invoke('window:execute', f.event, action)).toMatchObject({
      ok: false,
      error: { code: 'errInvalidPayload' }
    })
  expect(f.window.minimize).not.toHaveBeenCalled()
  expect(f.window.close).not.toHaveBeenCalled()
})

it('returns actual state, publishes maximize changes, defers normal close and cleans up', async () => {
  const f = harness()
  expect(await f.invoke('window:state', f.event)).toEqual({
    ok: true,
    value: { translucent: true, maximized: false }
  })
  await f.invoke('window:execute', f.event, 'minimize')
  expect(f.window.minimize).toHaveBeenCalledTimes(1)
  await f.invoke('window:execute', f.event, 'toggle-maximize')
  expect(f.window.webContents.send).toHaveBeenLastCalledWith('window:changed', {
    translucent: true,
    maximized: true
  })
  await f.invoke('window:execute', f.event, 'toggle-maximize')
  expect(f.window.webContents.send).toHaveBeenLastCalledWith('window:changed', {
    translucent: true,
    maximized: false
  })
  await f.invoke('window:execute', f.event, 'close')
  expect(f.window.close).not.toHaveBeenCalled()
  await new Promise<void>((resolve) => setImmediate(resolve))
  expect(f.window.close).toHaveBeenCalledTimes(1)
  f.emit('closed')
  expect(f.handlers.size).toBe(0)
})

it('preserves the opaque platform mode and refuses custom actions there', async () => {
  const f = harness(false)
  expect(await f.invoke('window:state', f.event)).toMatchObject({
    ok: true,
    value: { translucent: false }
  })
  expect(await f.invoke('window:execute', f.event, 'close')).toMatchObject({ ok: false })
  expect(f.window.close).not.toHaveBeenCalled()
})

it('reports Acrylic while keeping native window controls in charge', async () => {
  const f = harness(false, true)
  expect(await f.invoke('window:state', f.event)).toEqual({
    ok: true,
    value: { translucent: true, maximized: false, backdrop: 'acrylic' }
  })
  expect(await f.invoke('window:execute', f.event, 'minimize')).toMatchObject({
    ok: false,
    error: { code: 'errInvalidPayload' }
  })
  expect(f.window.minimize).not.toHaveBeenCalled()
})
