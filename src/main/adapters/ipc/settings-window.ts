import { BrowserWindow, ipcMain, shell } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { settingsChannels } from './contract'
import { registerSettingsHandlers } from './settings-service'

/** Native settings lifecycle and the trust boundary of the shared session. */
export function registerSettingsWindow(
  main: BrowserWindow,
  rendererUrl: string,
  preload: string
): void {
  let settings: BrowserWindow | null = null
  const baseUrl = new URL(rendererUrl).href.split('#')[0]
  const appUrl = (url: string): boolean => url.split('#')[0] === baseUrl
  const known = (contents: Electron.WebContents | null): boolean =>
    [main, settings].some(
      (window) => window !== null && !window.isDestroyed() && contents === window.webContents
    )
  const fromWindow = (event: unknown, window: BrowserWindow | null): boolean => {
    if (window === null || window.isDestroyed() || typeof event !== 'object' || event === null)
      return false
    const request = event as IpcMainInvokeEvent
    return (
      request.sender === window.webContents &&
      request.senderFrame === window.webContents.mainFrame &&
      appUrl(request.senderFrame.url)
    )
  }
  const permissionAllowed = (permission: string): boolean =>
    permission === 'local-fonts' || permission === 'clipboard-sanitized-write'
  main.webContents.session.setPermissionCheckHandler(
    (contents, permission, _origin, details) =>
      permissionAllowed(permission) &&
      known(contents) &&
      details.isMainFrame &&
      appUrl(details.requestingUrl ?? contents!.getURL())
  )
  main.webContents.session.setPermissionRequestHandler(
    (contents, permission, callback, details) => {
      callback(
        permissionAllowed(permission) &&
          known(contents) &&
          details.isMainFrame &&
          appUrl(details.requestingUrl)
      )
    }
  )

  registerSettingsHandlers(ipcMain, {
    isMain: (event) => fromWindow(event, main),
    isSettings: (event) => fromWindow(event, settings),
    open: async () => {
      if (settings !== null && !settings.isDestroyed()) {
        if (settings.isMinimized()) settings.restore()
        settings.show()
        settings.focus()
        return
      }
      const window = new BrowserWindow({
        parent: main,
        modal: false,
        title: 'Settings — DraftWrite',
        width: 800,
        height: 760,
        minWidth: 560,
        minHeight: 480,
        show: false,
        autoHideMenuBar: true,
        webPreferences: { preload, contextIsolation: true, sandbox: false }
      })
      settings = window
      window.once('closed', () => {
        if (settings === window) settings = null
      })
      window.once('ready-to-show', () => {
        window.show()
        window.focus()
      })
      window.webContents.setWindowOpenHandler(({ url }) => {
        void shell.openExternal(url)
        return { action: 'deny' }
      })
      try {
        await window.loadURL(`${baseUrl}#settings`)
      } catch (error) {
        if (!window.isDestroyed()) window.destroy()
        throw error
      }
    },
    close: () => {
      const window = settings
      // Let the invoke reply reach its renderer before destroying that renderer.
      setImmediate(() => {
        if (window !== null && !window.isDestroyed()) window.close()
      })
    },
    broadcast: (snapshot) => {
      for (const window of [main, settings]) {
        if (window !== null && !window.isDestroyed())
          window.webContents.send(settingsChannels.changed, snapshot)
      }
    }
  })
  main.once('closed', () => {
    if (settings !== null && !settings.isDestroyed()) settings.destroy()
    for (const channel of Object.values(settingsChannels)) ipcMain.removeHandler(channel)
  })
}
