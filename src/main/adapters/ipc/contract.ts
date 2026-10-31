import type { Article } from '../../article/model'
import type { Post } from '../../post/model'
import type { Story } from '../../story/model'
import type {
  TypographyPatch,
  TypographyPreferences,
  TypographySnapshot
} from '../../../shared/typography'

export const settingsChannels = {
  open: 'settings:open',
  close: 'settings:close',
  get: 'typography:get',
  patch: 'typography:patch',
  storage: 'typography:storage',
  changed: 'typography:changed'
} as const

/**
 * IPC contract of the presentation layer. Pure module: types and constants
 * only, no Electron, no Node, no database. The renderer, the preload and the
 * main process share it; domain types enter with `import type` only.
 */

/** A story travels over the boundary as the domain entity, untouched. */
export type StoryDTO = Story

/** An article travels over the boundary as the domain entity, untouched. */
export type ArticleDTO = Article

/** A post travels over the boundary as the domain entity, untouched. */
export type PostDTO = Post

/** Error payload of a failed result. */
export interface IpcError {
  /** Domain sentinel code (`err*`) or `errUnexpected`. */
  code: string
  message: string
}

/** Every channel answers with this envelope: success or failure, never a throw. */
export type IpcResult<T> = { ok: true; value: T } | { ok: false; error: IpcError }

/** Channel names of the story use cases. */
export const storyChannels = {
  create: 'story:create',
  get: 'story:get',
  list: 'story:list',
  update: 'story:update',
  delete: 'story:delete'
} as const

/** Channel names of the article use cases. */
export const articleChannels = {
  create: 'article:create',
  get: 'article:get',
  listByStory: 'article:listByStory',
  list: 'article:list',
  update: 'article:update',
  delete: 'article:delete'
} as const

/** Channel names of the post use cases. */
export const postChannels = {
  create: 'post:create',
  get: 'post:get',
  list: 'post:list',
  update: 'post:update',
  delete: 'post:delete'
} as const

/**
 * Minimal structural view of Electron's `ipcMain`, so the registration can be
 * exercised without Electron (see the fake in `register.test.ts`).
 */
export interface IpcHandlerRegistry {
  handle(
    channel: string,
    listener: (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown
  ): void
}

/** API the preload exposes as `window.draftwrite`. */
export interface DraftwriteApi {
  settings: {
    open(): Promise<IpcResult<void>>
    close(): Promise<IpcResult<void>>
    get(initial?: TypographyPreferences): Promise<IpcResult<TypographySnapshot>>
    patch(update: TypographyPatch): Promise<IpcResult<TypographySnapshot>>
    storage(revision: number, failed: boolean): Promise<IpcResult<void>>
    onChanged(listener: (snapshot: TypographySnapshot) => void): () => void
  }
  story: {
    create(story: StoryDTO): Promise<IpcResult<StoryDTO>>
    get(id: string): Promise<IpcResult<StoryDTO>>
    list(): Promise<IpcResult<StoryDTO[]>>
    update(story: StoryDTO): Promise<IpcResult<StoryDTO>>
    delete(id: string): Promise<IpcResult<void>>
  }
  article: {
    create(article: ArticleDTO): Promise<IpcResult<ArticleDTO>>
    get(id: string): Promise<IpcResult<ArticleDTO>>
    listByStory(storyID: string): Promise<IpcResult<ArticleDTO[]>>
    list(): Promise<IpcResult<ArticleDTO[]>>
    update(article: ArticleDTO): Promise<IpcResult<ArticleDTO>>
    delete(id: string): Promise<IpcResult<void>>
  }
  post: {
    create(post: PostDTO): Promise<IpcResult<PostDTO>>
    get(id: string): Promise<IpcResult<PostDTO>>
    list(): Promise<IpcResult<PostDTO[]>>
    update(post: PostDTO): Promise<IpcResult<PostDTO>>
    delete(id: string): Promise<IpcResult<void>>
  }
}
