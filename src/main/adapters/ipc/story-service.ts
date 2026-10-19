import type { StoryService } from '../../story/service'
import { storyChannels, type IpcHandlerRegistry } from './contract'
import { toIpcResult } from './errors'
import { expectString, parseStoryCreatePayload, parseStoryUpdatePayload } from './validate'

/**
 * Registers the story channels. Every handler validates its payload, delegates
 * to the application service and answers with an `IpcResult`; no throw escapes.
 */
export function registerStoryHandlers(ipcMain: IpcHandlerRegistry, service: StoryService): void {
  ipcMain.handle(storyChannels.create, (_event, payload) =>
    toIpcResult(() => service.create(parseStoryCreatePayload(payload)))
  )
  ipcMain.handle(storyChannels.get, (_event, id) =>
    toIpcResult(() => service.get(expectString(id, 'id')))
  )
  ipcMain.handle(storyChannels.list, () => toIpcResult(() => service.list()))
  ipcMain.handle(storyChannels.update, (_event, payload) =>
    toIpcResult(() => service.update(parseStoryUpdatePayload(payload)))
  )
  ipcMain.handle(storyChannels.delete, (_event, id) =>
    toIpcResult(() => service.delete(expectString(id, 'id')))
  )
}
