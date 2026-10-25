import type { Article, Story } from '../data/types'
import type { LoadStatus } from '../state/use-list'
import type { SourceState } from './SourcePane/SourcePane'

/** Resolves a story source from the library it already holds. */
export function storySource(storyId: string, story: Story | null, status: LoadStatus): SourceState {
  if (story !== null) {
    return { kind: 'ready', content: { kind: 'story', story } }
  }

  if (status === 'loading') {
    return { kind: 'loading', sourceId: storyId }
  }

  if (status === 'error') {
    return { kind: 'error', sourceId: storyId }
  }

  return { kind: 'missing', sourceId: storyId }
}

/** Resolves an article source, carrying the story it came from when it is loaded. */
export function articleSource(
  articleId: string,
  article: Article | null,
  story: Story | null,
  status: LoadStatus
): SourceState {
  if (article !== null) {
    return { kind: 'ready', content: { kind: 'article', article, story } }
  }

  if (status === 'loading') {
    return { kind: 'loading', sourceId: articleId }
  }

  if (status === 'error') {
    return { kind: 'error', sourceId: articleId }
  }

  return { kind: 'missing', sourceId: articleId }
}

type SourceResolution = {
  storyById: (id: string | null) => Story | null
  articleById: (id: string | null) => Article | null
  storiesStatus: LoadStatus
  articlesStatus: LoadStatus
}

/**
 * Resolves the source a post points at. The two ids are exclusive: the model
 * never stores both, and the story wins if a payload ever carries both.
 */
export function postSource(
  storyID: string | null,
  articleID: string | null,
  library: SourceResolution
): SourceState {
  if (storyID !== null) {
    return storySource(storyID, library.storyById(storyID), library.storiesStatus)
  }

  if (articleID !== null) {
    const article = library.articleById(articleID)

    return articleSource(
      articleID,
      article,
      article === null ? null : library.storyById(article.StoryID),
      library.articlesStatus
    )
  }

  return { kind: 'empty' }
}
