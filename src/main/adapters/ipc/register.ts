import type { TagService } from '../../tag/service'
import { registerTagHandlers } from './tag-service'
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
  tags?: TagService
  story: StoryService
  article: ArticleService
  post: PostService
  editorial?: EditorialService
}

/** Registers the application services available at this composition root. */
export function registerIpcHandlers(ipcMain: IpcHandlerRegistry, services: IpcServices): void {
  if (services.tags) registerTagHandlers(ipcMain, services.tags)
  registerStoryHandlers(ipcMain, services.story)
  registerArticleHandlers(ipcMain, services.article)
  registerPostHandlers(ipcMain, services.post)
  if (services.editorial) registerEditorialHandlers(ipcMain, services.editorial)
}
