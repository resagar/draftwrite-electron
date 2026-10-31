import { makeArticle, makePost, makeStory } from './factories'
import type { DataPort, NewArticle, NewPost, NewStory } from '../port'
import type { Article, Post, Story } from '../types'
import { applyTypographyPatch, normalizePreferences } from '../../../../shared/typography'
import type { TypographySnapshot } from '../../../../shared/typography'

export type FakePortOptions = {
  fontFamilies?: string[]
  stories?: Story[]
  articles?: Article[]
  posts?: Post[]
  listStoriesFailures?: number
  listArticlesFailures?: number
  listPostsFailures?: number
  listStoriesGate?: Promise<void>
  listArticlesGate?: Promise<void>
  listPostsGate?: Promise<void>
  createStoryFailures?: number
  updateStoryFailures?: number
  updateStoryGate?: Promise<void>
  createArticleFailures?: number
  updateArticleFailures?: number
  createPostFailures?: number
  updatePostFailures?: number
  deleteStoryFailures?: number
  deleteArticleFailures?: number
  deletePostFailures?: number
}

export type FakePort = {
  port: DataPort
  calls: {
    openSettings: number
    closeSettings: number
    listStories: number
    listArticles: number
    listPosts: number
    createStory: number
    updateStory: number
    createArticle: number
    updateArticle: number
    createPost: number
    updatePost: number
    deleteStory: number
    deleteArticle: number
    deletePost: number
  }
  createdStories: NewStory[]
  updatedStories: Story[]
  createdArticles: NewArticle[]
  updatedArticles: Article[]
  createdPosts: NewPost[]
  updatedPosts: Post[]
  deletedStoryIds: string[]
  deletedArticleIds: string[]
  deletedPostIds: string[]
}

type Counter = { remaining: number }

async function load<T>(source: () => T, counter: Counter, gate?: Promise<void>): Promise<T> {
  if (gate) {
    await gate
  }

  if (counter.remaining > 0) {
    counter.remaining -= 1
    throw new Error('service unavailable')
  }

  return source()
}

async function write<T>(produce: () => T, counter: Counter): Promise<T> {
  if (counter.remaining > 0) {
    counter.remaining -= 1
    throw new Error('service unavailable')
  }

  return produce()
}

export function createFakePort(options: FakePortOptions = {}): FakePort {
  const calls = {
    openSettings: 0,
    closeSettings: 0,
    listStories: 0,
    listArticles: 0,
    listPosts: 0,
    createStory: 0,
    updateStory: 0,
    createArticle: 0,
    updateArticle: 0,
    createPost: 0,
    updatePost: 0,
    deleteStory: 0,
    deleteArticle: 0,
    deletePost: 0
  }

  const stories = [...(options.stories ?? [])]
  let typography: TypographySnapshot | null = null
  const typographyListeners = new Set<(snapshot: TypographySnapshot) => void>()
  const notifyTypography = (): void => {
    if (typography)
      for (const listener of typographyListeners)
        listener({ ...typography, preferences: normalizePreferences(typography.preferences) })
  }
  const articles = [...(options.articles ?? [])]
  const posts = [...(options.posts ?? [])]
  const createdStories: NewStory[] = []
  const updatedStories: Story[] = []
  const createdArticles: NewArticle[] = []
  const updatedArticles: Article[] = []
  const createdPosts: NewPost[] = []
  const updatedPosts: Post[] = []
  const deletedStoryIds: string[] = []
  const deletedArticleIds: string[] = []
  const deletedPostIds: string[] = []

  const listStoryCounter = { remaining: options.listStoriesFailures ?? 0 }
  const listArticleCounter = { remaining: options.listArticlesFailures ?? 0 }
  const listPostCounter = { remaining: options.listPostsFailures ?? 0 }
  const createStoryCounter = { remaining: options.createStoryFailures ?? 0 }
  const updateStoryCounter = { remaining: options.updateStoryFailures ?? 0 }
  const createArticleCounter = { remaining: options.createArticleFailures ?? 0 }
  const updateArticleCounter = { remaining: options.updateArticleFailures ?? 0 }
  const createPostCounter = { remaining: options.createPostFailures ?? 0 }
  const updatePostCounter = { remaining: options.updatePostFailures ?? 0 }
  const deleteStoryCounter = { remaining: options.deleteStoryFailures ?? 0 }
  const deleteArticleCounter = { remaining: options.deleteArticleFailures ?? 0 }
  const deletePostCounter = { remaining: options.deletePostFailures ?? 0 }

  return {
    calls,
    createdStories,
    updatedStories,
    createdArticles,
    updatedArticles,
    createdPosts,
    updatedPosts,
    deletedStoryIds,
    deletedArticleIds,
    deletedPostIds,
    port: {
      async openSettings() {
        calls.openSettings += 1
        notifyTypography()
      },
      async closeSettings() {
        calls.closeSettings += 1
      },
      async getTypography(initial) {
        typography ??= {
          preferences: normalizePreferences(initial),
          revision: 0,
          storageError: false
        }
        return typography
      },
      async patchTypography(update) {
        if (!typography) throw new Error('Settings are not initialized')
        typography = {
          preferences: applyTypographyPatch(typography.preferences, update),
          revision: typography.revision + 1,
          storageError: false
        }
        notifyTypography()
        return typography
      },
      async reportTypographyStorage(revision, failed) {
        if (typography?.revision !== revision || typography.storageError === failed) return
        typography = { ...typography, revision: revision + 1, storageError: failed }
        notifyTypography()
      },
      onTypographyChanged(listener) {
        typographyListeners.add(listener)
        return () => {
          typographyListeners.delete(listener)
        }
      },
      async listFontFamilies() {
        return [...(options.fontFamilies ?? [])]
      },
      async listStories() {
        calls.listStories += 1
        return load(() => [...stories], listStoryCounter, options.listStoriesGate)
      },
      async listArticles() {
        calls.listArticles += 1
        return load(() => [...articles], listArticleCounter, options.listArticlesGate)
      },
      async listPosts() {
        calls.listPosts += 1
        return load(() => [...posts], listPostCounter, options.listPostsGate)
      },
      createStory(input) {
        calls.createStory += 1
        return write(() => {
          createdStories.push(input)
          const created = makeStory({
            ID: `story-${stories.length + 1}`,
            Topic: input.topic,
            Titles: input.titles,
            Tags: input.tags,
            Text: input.text
          })
          stories.unshift(created)
          return created
        }, createStoryCounter)
      },
      createArticle(input) {
        calls.createArticle += 1
        return write(() => {
          createdArticles.push(input)
          const created = makeArticle({
            ID: `article-${articles.length + 1}`,
            StoryID: input.storyId,
            Title: input.title,
            Subtitle: input.subtitle,
            Target: input.target,
            Text: input.text
          })
          articles.unshift(created)
          return created
        }, createArticleCounter)
      },
      async updateStory(story) {
        calls.updateStory += 1

        if (options.updateStoryGate) {
          await options.updateStoryGate
        }

        return write(() => {
          updatedStories.push(story)
          const index = stories.findIndex((current) => current.ID === story.ID)
          if (index >= 0) {
            stories[index] = story
          }
          return story
        }, updateStoryCounter)
      },
      updateArticle(article) {
        calls.updateArticle += 1
        return write(() => {
          updatedArticles.push(article)
          const index = articles.findIndex((current) => current.ID === article.ID)
          if (index >= 0) {
            articles[index] = article
          }
          return article
        }, updateArticleCounter)
      },
      createPost(input) {
        calls.createPost += 1
        return write(() => {
          createdPosts.push(input)
          const created = makePost({
            ID: `post-${posts.length + 1}`,
            Topic: input.topic,
            Text: input.text,
            State: 'pending',
            StoryID: input.storyId,
            ArticleID: input.articleId
          })
          posts.unshift(created)
          return created
        }, createPostCounter)
      },
      updatePost(post) {
        calls.updatePost += 1
        return write(() => {
          updatedPosts.push(post)
          const index = posts.findIndex((current) => current.ID === post.ID)
          if (index >= 0) {
            posts[index] = post
          }
          return post
        }, updatePostCounter)
      },
      deletePost(id) {
        calls.deletePost += 1
        return write(() => {
          deletedPostIds.push(id)
          const index = posts.findIndex((post) => post.ID === id)
          if (index >= 0) {
            posts.splice(index, 1)
          }
        }, deletePostCounter)
      },
      deleteStory(id) {
        calls.deleteStory += 1
        return write(() => {
          deletedStoryIds.push(id)
          const index = stories.findIndex((story) => story.ID === id)
          if (index >= 0) {
            stories.splice(index, 1)
          }

          for (let position = articles.length - 1; position >= 0; position -= 1) {
            if (articles[position].StoryID === id) {
              articles.splice(position, 1)
            }
          }
        }, deleteStoryCounter)
      },
      deleteArticle(id) {
        calls.deleteArticle += 1
        return write(() => {
          deletedArticleIds.push(id)
          const index = articles.findIndex((article) => article.ID === id)
          if (index >= 0) {
            articles.splice(index, 1)
          }
        }, deleteArticleCounter)
      }
    }
  }
}
