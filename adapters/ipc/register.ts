import type { ArticleService } from '../../src/main/article/service'
import type { StoryService } from '../../src/main/story/service'
import { registerArticleHandlers } from './article-service'
import type { IpcHandlerRegistry } from './contract'
import { registerStoryHandlers } from './story-service'

/** Application services exposed over the IPC boundary. */
export interface IpcServices {
  story: StoryService
  article: ArticleService
}

/** Registers the 11 handlers of the contract: story first, then article. */
export function registerIpcHandlers(ipcMain: IpcHandlerRegistry, services: IpcServices): void {
  registerStoryHandlers(ipcMain, services.story)
  registerArticleHandlers(ipcMain, services.article)
}
