import type {
  ArticleDTO,
  DraftwriteApi,
  IpcResult,
  PostDTO,
  StoryDTO
} from '../../../main/adapters/ipc/contract'
import { toArticle, toArticles, toPost, toPosts, toStories, toStory } from './normalise'
import type { DataPort } from './port'
import type { Article, Post, Story } from './types'

/** Error carried by a failed `IpcResult`, re-hydrated at the port boundary. */
export class IpcError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'IpcError'
    this.code = code
  }
}

function unwrap<T>(result: IpcResult<T>): T {
  if (!result.ok) {
    throw new IpcError(result.error.code, result.error.message)
  }
  return result.value
}

// The domain owns the ID and the timestamps and ignores what the renderer
// sends on create; the wire type still demands them, so they travel as
// placeholders, like the old bindings port did.
function backendOwnedFields(): { id: string; createdAt: string; updatedAt: string } {
  const now = new Date().toISOString()
  return { id: '', createdAt: now, updatedAt: now }
}

function toStoryDTO(story: Story): StoryDTO {
  return {
    id: story.ID,
    topic: story.Topic,
    titles: story.Titles,
    tags: story.Tags,
    text: story.Text,
    createdAt: story.CreatedAt,
    updatedAt: story.UpdatedAt
  }
}

function toArticleDTO(article: Article): ArticleDTO {
  return {
    id: article.ID,
    storyID: article.StoryID,
    title: article.Title,
    subtitle: article.Subtitle,
    target: article.Target,
    text: article.Text,
    createdAt: article.CreatedAt,
    updatedAt: article.UpdatedAt
  }
}

function toPostDTO(post: Post): PostDTO {
  return {
    id: post.ID,
    topic: post.Topic,
    text: post.Text,
    state: post.State,
    scheduledAt: post.ScheduledAt,
    storyID: post.StoryID,
    articleID: post.ArticleID,
    createdAt: post.CreatedAt,
    updatedAt: post.UpdatedAt
  }
}

export function createIpcPort(api: DraftwriteApi = window.draftwrite): DataPort {
  return {
    openSettings: async () => {
      unwrap(await api.settings.open())
    },
    closeSettings: async () => {
      unwrap(await api.settings.close())
    },
    getTypography: async (initial) => unwrap(await api.settings.get(initial)),
    patchTypography: async (update) => unwrap(await api.settings.patch(update)),
    reportTypographyStorage: async (revision, failed) => {
      unwrap(await api.settings.storage(revision, failed))
    },
    onTypographyChanged: (listener) => api.settings.onChanged(listener),
    listFontFamilies: async () => {
      const browser = window as Window & {
        queryLocalFonts?: () => Promise<{ family: string }[]>
      }
      if (!browser.queryLocalFonts) throw new Error('Local font access is unavailable')
      return (await browser.queryLocalFonts()).map(({ family }) => family)
    },
    listStories: async () => toStories(unwrap(await api.story.list())),
    listArticles: async () => toArticles(unwrap(await api.article.list())),
    listPosts: async () => toPosts(unwrap(await api.post.list())),
    createStory: async (input) =>
      toStory(
        unwrap(
          await api.story.create({
            ...backendOwnedFields(),
            topic: input.topic,
            titles: input.titles,
            tags: input.tags,
            text: input.text
          })
        )
      ),
    updateStory: async (story) => toStory(unwrap(await api.story.update(toStoryDTO(story)))),
    createArticle: async (input) =>
      toArticle(
        unwrap(
          await api.article.create({
            ...backendOwnedFields(),
            storyID: input.storyId,
            title: input.title,
            subtitle: input.subtitle,
            target: input.target,
            text: input.text
          })
        )
      ),
    updateArticle: async (article) =>
      toArticle(unwrap(await api.article.update(toArticleDTO(article)))),
    createPost: async (input) =>
      toPost(
        unwrap(
          await api.post.create({
            ...backendOwnedFields(),
            topic: input.topic,
            text: input.text,
            state: 'pending',
            scheduledAt: null,
            storyID: input.storyId,
            articleID: input.articleId
          })
        )
      ),
    updatePost: async (post) => toPost(unwrap(await api.post.update(toPostDTO(post)))),
    deleteStory: async (id) => {
      unwrap(await api.story.delete(id))
    },
    deleteArticle: async (id) => {
      unwrap(await api.article.delete(id))
    },
    deletePost: async (id) => {
      unwrap(await api.post.delete(id))
    }
  }
}
