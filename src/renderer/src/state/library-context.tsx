/* eslint-disable react-refresh/only-export-components -- the provider and the hook that reads it belong together */
import { createContext, useContext, useMemo, type JSX, type ReactNode } from 'react'
import {
  collectTags,
  filterArticlesByTag,
  filterStoriesByTag,
  sortByUpdatedAt
} from '../data/library'
import type { Article, Story } from '../data/types'
import { useArticles } from './use-articles'
import { useStories } from './use-stories'
import type { LoadStatus } from './use-list'
import { useWorkspace } from './workspace-context'

export type LibraryData = {
  stories: Story[]
  allStories: Story[]
  articles: Article[]
  storiesTotal: number
  articlesTotal: number
  storiesStatus: LoadStatus
  articlesStatus: LoadStatus
  tags: string[]
  articleById: (id: string | null) => Article | null
  storyById: (id: string | null) => Story | null
  reloadStories: () => void
  reloadArticles: () => void
  upsertStory: (story: Story) => void
  upsertArticle: (article: Article) => void
}

const LibraryDataContext = createContext<LibraryData | null>(null)

export function LibraryProvider({ children }: { children: ReactNode }): JSX.Element {
  const { tagFilter, sortDirection } = useWorkspace()
  const storyList = useStories()
  const articleList = useArticles()

  const value = useMemo<LibraryData>(() => {
    const visibleStories = sortByUpdatedAt(
      filterStoriesByTag(storyList.items, tagFilter),
      sortDirection
    )
    const visibleArticles = sortByUpdatedAt(
      filterArticlesByTag(articleList.items, storyList.items, tagFilter),
      sortDirection
    )

    return {
      stories: visibleStories,
      allStories: storyList.items,
      articles: visibleArticles,
      storiesTotal: storyList.items.length,
      articlesTotal: articleList.items.length,
      storiesStatus: storyList.status,
      articlesStatus: articleList.status,
      tags: collectTags(storyList.items),
      articleById: (id) => articleList.items.find((article) => article.ID === id) ?? null,
      storyById: (id) => storyList.items.find((story) => story.ID === id) ?? null,
      reloadStories: storyList.reload,
      reloadArticles: articleList.reload,
      upsertStory: storyList.upsert,
      upsertArticle: articleList.upsert
    }
  }, [articleList, storyList, tagFilter, sortDirection])

  return <LibraryDataContext.Provider value={value}>{children}</LibraryDataContext.Provider>
}

export function useLibrary(): LibraryData {
  const data = useContext(LibraryDataContext)
  if (data === null) {
    throw new Error('useLibrary requires a LibraryProvider')
  }
  return data
}
