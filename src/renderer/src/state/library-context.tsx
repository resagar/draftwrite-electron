import { useTagMutations } from './tag-mutation-context'
/* eslint-disable react-refresh/only-export-components -- the provider and the hook that reads it belong together */
import { createContext, useContext, useMemo, useEffect, type JSX, type ReactNode } from 'react'
import {
  collectTags,
  filterArticlesByTag,
  filterPostsByTag,
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
  allArticles: Article[]
  posts: Post[]
  allPosts: Post[]
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
  const mutations = useTagMutations()
  const { mapItems: mapStories } = storyList
  const { mapItems: mapArticles } = articleList
  const { mapItems: mapPosts } = postList
  useEffect(
    () =>
      mutations.subscribe((name) => {
        const remove = <T extends { Tags: string[] }>(entity: T): T => ({
          ...entity,
          Tags: entity.Tags.filter((tag) => tag !== name)
        })
        mapStories(remove)
        mapArticles(remove)
        mapPosts(remove)
      }),
    [mutations, mapStories, mapArticles, mapPosts]
  )

  const value = useMemo<LibraryData>(() => {
    const visibleStories = sortByUpdatedAt(
      filterStoriesByTag(storyList.items, tagFilter),
      sortDirection
    )
    const visibleArticles = sortByUpdatedAt(
      filterArticlesByTag(articleList.items, storyList.items, tagFilter),
      sortDirection
    )
    const visiblePosts = sortByUpdatedAt(filterPostsByTag(postList.items, tagFilter), sortDirection)

    return {
      stories: visibleStories,
      allStories: storyList.items,
      articles: visibleArticles,
      allArticles: articleList.items,
      posts: visiblePosts,
      allPosts: postList.items,
      storiesTotal: storyList.items.length,
      articlesTotal: articleList.items.length,
      storiesStatus: storyList.status,
      articlesStatus: articleList.status,
      postsStatus: postList.status,
      tags: collectTags([...storyList.items, ...articleList.items, ...postList.items]),
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
