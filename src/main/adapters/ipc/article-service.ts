import type { ArticleService } from '../../article/service'
import { articleChannels, type IpcHandlerRegistry } from './contract'
import { toIpcResult } from './errors'
import { expectString, parseArticleCreatePayload, parseArticleUpdatePayload } from './validate'

/**
 * Registers the article channels. Every handler validates its payload,
 * delegates to the application service and answers with an `IpcResult`; no
 * throw escapes.
 */
export function registerArticleHandlers(
  ipcMain: IpcHandlerRegistry,
  service: ArticleService
): void {
  ipcMain.handle(articleChannels.create, (_event, payload) =>
    toIpcResult(() => service.create(parseArticleCreatePayload(payload)))
  )
  ipcMain.handle(articleChannels.get, (_event, id) =>
    toIpcResult(() => service.get(expectString(id, 'id')))
  )
  ipcMain.handle(articleChannels.listByStory, (_event, storyID) =>
    toIpcResult(() => service.listByStory(expectString(storyID, 'storyID')))
  )
  ipcMain.handle(articleChannels.list, () => toIpcResult(() => service.list()))
  ipcMain.handle(articleChannels.update, (_event, payload) =>
    toIpcResult(() => service.update(parseArticleUpdatePayload(payload)))
  )
  ipcMain.handle(articleChannels.delete, (_event, id) =>
    toIpcResult(() => service.delete(expectString(id, 'id')))
  )
}
