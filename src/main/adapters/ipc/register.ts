import type { ArticleService } from '../../article/service'
import type { PostService } from '../../post/service'
import type { StoryService } from '../../story/service'
import { registerArticleHandlers } from './article-service'
import type { IpcHandlerRegistry } from './contract'
import { registerPostHandlers } from './post-service'
import { registerStoryHandlers } from './story-service'

/** Application services exposed over the IPC boundary. */
export interface IpcServices {
  story: StoryService
  article: ArticleService
  post: PostService
}

/** Registers the 15 handlers of the contract: story first, then article and post. */
export function registerIpcHandlers(ipcMain: IpcHandlerRegistry, services: IpcServices): void {
  registerStoryHandlers(ipcMain, services.story)
  registerArticleHandlers(ipcMain, services.article)
  registerPostHandlers(ipcMain, services.post)
}
