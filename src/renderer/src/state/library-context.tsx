/* eslint-disable react-refresh/only-export-components -- the provider and the hook that reads it belong together */
import { createContext, useContext, useMemo, type JSX, type ReactNode } from 'react'
import {
  collectTags,
  filterArticlesByTag,
  filterStoriesByTag,
  sortByUpdatedAt
} from '../data/library'
import type { Article, Post, Story } from '../data/types'
import { useArticles } from './use-articles'
import { usePosts } from './use-posts'
import { useStories } from './use-stories'
import type { LoadStatus } from './use-list'
import { useWorkspace } from './workspace-context'

export type LibraryData = {
  stories: Story[]
  allStories: Story[]
  articles: Article[]
  posts: Post[]
  storiesTotal: number
  articlesTotal: number
  storiesStatus: LoadStatus
  articlesStatus: LoadStatus
  postsStatus: LoadStatus
  tags: string[]
  articleById: (id: string | null) => Article | null
  storyById: (id: string | null) => Story | null
  postById: (id: string | null) => Post | null
  reloadStories: () => void
  reloadArticles: () => void
  reloadPosts: () => void
  upsertStory: (story: Story) => void
  upsertArticle: (article: Article) => void
  upsertPost: (post: Post) => void
}

const LibraryDataContext = createContext<LibraryData | null>(null)

export function LibraryProvider({ children }: { children: ReactNode }): JSX.Element {
  const { tagFilter, sortDirection } = useWorkspace()
  const storyList = useStories()
  const articleList = useArticles()
  const postList = usePosts()

  const value = useMemo<LibraryData>(() => {
    const visibleStories = sortByUpdatedAt(
      filterStoriesByTag(storyList.items, tagFilter),
      sortDirection
    )
    const visibleArticles = sortByUpdatedAt(
      filterArticlesByTag(articleList.items, storyList.items, tagFilter),
      sortDirection
    )
    const visiblePosts = sortByUpdatedAt(postList.items, sortDirection)

    return {
      stories: visibleStories,
      allStories: storyList.items,
      articles: visibleArticles,
      posts: visiblePosts,
      storiesTotal: storyList.items.length,
      articlesTotal: articleList.items.length,
      storiesStatus: storyList.status,
      articlesStatus: articleList.status,
      postsStatus: postList.status,
      tags: collectTags(storyList.items),
      articleById: (id) => articleList.items.find((article) => article.ID === id) ?? null,
      storyById: (id) => storyList.items.find((story) => story.ID === id) ?? null,
      postById: (id) => postList.items.find((post) => post.ID === id) ?? null,
      reloadStories: storyList.reload,
      reloadArticles: articleList.reload,
      reloadPosts: postList.reload,
      upsertStory: storyList.upsert,
      upsertArticle: articleList.upsert,
      upsertPost: postList.upsert
    }
  }, [articleList, storyList, postList, tagFilter, sortDirection])

  return <LibraryDataContext.Provider value={value}>{children}</LibraryDataContext.Provider>
}

export function useLibrary(): LibraryData {
  const data = useContext(LibraryDataContext)
  if (data === null) {
    throw new Error('useLibrary requires a LibraryProvider')
  }
  return data
}
