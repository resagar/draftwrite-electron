import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { articleChannels, postChannels, storyChannels } from '../main/adapters/ipc/contract'
import type {
  ArticleDTO,
  DraftwriteApi,
  IpcResult,
  PostDTO,
  StoryDTO
} from '../main/adapters/ipc/contract'

/**
 * Forwards a call to its channel and returns the envelope as is. The
 * re-hydration of `{ code }` into domain errors lives in the renderer's
 * `ipc-port` (frontend phase).
 */
function invoke<T>(channel: string, ...args: unknown[]): Promise<IpcResult<T>> {
  return ipcRenderer.invoke(channel, ...args)
}

/** Typed data entry point of the renderer. */
const draftwrite: DraftwriteApi = {
  story: {
    create: (story: StoryDTO) => invoke<StoryDTO>(storyChannels.create, story),
    get: (id: string) => invoke<StoryDTO>(storyChannels.get, id),
    list: () => invoke<StoryDTO[]>(storyChannels.list),
    update: (story: StoryDTO) => invoke<StoryDTO>(storyChannels.update, story),
    delete: (id: string) => invoke<void>(storyChannels.delete, id)
  },
  article: {
    create: (article: ArticleDTO) => invoke<ArticleDTO>(articleChannels.create, article),
    get: (id: string) => invoke<ArticleDTO>(articleChannels.get, id),
    listByStory: (storyID: string) => invoke<ArticleDTO[]>(articleChannels.listByStory, storyID),
    list: () => invoke<ArticleDTO[]>(articleChannels.list),
    update: (article: ArticleDTO) => invoke<ArticleDTO>(articleChannels.update, article),
    delete: (id: string) => invoke<void>(articleChannels.delete, id)
  },
  post: {
    create: (post: PostDTO) => invoke<PostDTO>(postChannels.create, post),
    get: (id: string) => invoke<PostDTO>(postChannels.get, id),
    list: () => invoke<PostDTO[]>(postChannels.list),
    update: (post: PostDTO) => invoke<PostDTO>(postChannels.update, post),
    delete: (id: string) => invoke<void>(postChannels.delete, id)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to the renderer only if
// context isolation is enabled, otherwise add them to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('draftwrite', draftwrite)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.draftwrite = draftwrite
}
