import { windowChannels, type WindowState } from '../../../shared/window-controls'
import type { IpcHandlerRegistry } from './contract'
import { toIpcResult } from './errors'

interface ShellWindow {
  webContents: { mainFrame: unknown; send(channel: string, state: WindowState): void }
  isDestroyed(): boolean
  isMaximized(): boolean
  minimize(): void
  maximize(): void
  unmaximize(): void
  close(): void
  on(event: 'maximize' | 'unmaximize', listener: () => void): unknown
  once(event: 'closed', listener: () => void): unknown
  removeListener(event: 'maximize' | 'unmaximize', listener: () => void): unknown
}

type Registry = IpcHandlerRegistry & { removeHandler(channel: string): void }

export function registerWindowControls(
  ipc: Registry,
  window: ShellWindow,
  rendererUrl: string,
  translucent: boolean,
  acrylic = false
): void {
  const baseUrl = new URL(rendererUrl).href
  const state = (): WindowState => ({
    translucent: translucent || acrylic,
    maximized: window.isMaximized(),
    ...(acrylic ? { backdrop: 'acrylic' as const } : {})
  })
  const authorize = (event: unknown): void => {
    if (
      !window.isDestroyed() &&
      typeof event === 'object' &&
      event !== null &&
      'sender' in event &&
      event.sender === window.webContents &&
      'senderFrame' in event &&
      event.senderFrame === window.webContents.mainFrame &&
      typeof event.senderFrame === 'object' &&
      event.senderFrame !== null &&
      'url' in event.senderFrame &&
      event.senderFrame.url === baseUrl
    )
      return
    throw { code: 'errForbidden', message: 'This frame cannot control the main window' }
  }
  ipc.handle(windowChannels.state, (event) =>
    toIpcResult(async () => {
      authorize(event)
      return state()
    })
  )
  ipc.handle(windowChannels.execute, (event, action) =>
    toIpcResult(async () => {
      authorize(event)
      if (!translucent || !['minimize', 'toggle-maximize', 'close'].includes(action as string))
        throw { code: 'errInvalidPayload', message: 'Invalid window action' }
      if (action === 'minimize') window.minimize()
      if (action === 'toggle-maximize')
        window.isMaximized() ? window.unmaximize() : window.maximize()
      // Reply before the renderer is closed, preserving the normal close lifecycle.
      if (action === 'close')
        setImmediate(() => {
          if (!window.isDestroyed()) window.close()
        })
      return state()
    })
  )
  const publish = (): void => {
    if (!window.isDestroyed()) window.webContents.send(windowChannels.changed, state())
  }
  window.on('maximize', publish)
  window.on('unmaximize', publish)
  window.once('closed', () => {
    window.removeListener('maximize', publish)
    window.removeListener('unmaximize', publish)
    ipc.removeHandler(windowChannels.state)
    ipc.removeHandler(windowChannels.execute)
  })
}
