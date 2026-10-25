import type { PostService } from '../../post/service'
import { postChannels, type IpcHandlerRegistry } from './contract'
import { toIpcResult } from './errors'
import { expectString, parsePostCreatePayload, parsePostUpdatePayload } from './validate'

/**
 * Registers the post channels. Every handler validates its payload, delegates
 * to the application service and answers with an `IpcResult`; no throw
 * escapes.
 */
export function registerPostHandlers(ipcMain: IpcHandlerRegistry, service: PostService): void {
  ipcMain.handle(postChannels.create, (_event, payload) =>
    toIpcResult(() => service.create(parsePostCreatePayload(payload)))
  )
  ipcMain.handle(postChannels.get, (_event, id) =>
    toIpcResult(() => service.get(expectString(id, 'id')))
  )
  ipcMain.handle(postChannels.list, () => toIpcResult(() => service.list()))
  ipcMain.handle(postChannels.update, (_event, payload) =>
    toIpcResult(() => service.update(parsePostUpdatePayload(payload)))
  )
}
