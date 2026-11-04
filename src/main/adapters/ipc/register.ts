import type { ArticleService } from '../../article/service'
import type { PostService } from '../../post/service'
import type { StoryService } from '../../story/service'
import { registerArticleHandlers } from './article-service'
import type { IpcHandlerRegistry } from './contract'
import { registerPostHandlers } from './post-service'
import { registerStoryHandlers } from './story-service'
import type { EditorialService } from '../../editorial/service'
import { registerEditorialHandlers } from './editorial-service'

/** Application services exposed over the IPC boundary. */
export interface IpcServices {
  story: StoryService
  article: ArticleService
  post: PostService
  editorial?: EditorialService
}

/** Registers the 16 handlers of the contract: story first, then article and post. */
export function registerIpcHandlers(ipcMain: IpcHandlerRegistry, services: IpcServices): void {
  registerStoryHandlers(ipcMain, services.story)
  registerArticleHandlers(ipcMain, services.article)
  registerPostHandlers(ipcMain, services.post)
  if (services.editorial) registerEditorialHandlers(ipcMain, services.editorial)
}
