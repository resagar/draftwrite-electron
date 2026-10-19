import type { Article, Story } from './types'

export type SortDirection = 'desc' | 'asc'

export function collectTags(stories: Story[]): string[] {
  const tags = new Set<string>()

  for (const story of stories) {
    for (const tag of story.Tags) {
      const trimmed = tag.trim()
      if (trimmed !== '') {
        tags.add(trimmed)
      }
    }
  }

  return [...tags].sort((left, right) => left.localeCompare(right))
}

export function filterStoriesByTag(stories: Story[], tag: string | null): Story[] {
  if (tag === null) {
    return stories
  }

  return stories.filter((story) => story.Tags.includes(tag))
}

export function filterArticlesByTag(
  articles: Article[],
  stories: Story[],
  tag: string | null
): Article[] {
  if (tag === null) {
    return articles
  }

  const taggedStoryIds = new Set(filterStoriesByTag(stories, tag).map((story) => story.ID))

  return articles.filter((article) => taggedStoryIds.has(article.StoryID))
}

export function sortByUpdatedAt<T extends { UpdatedAt: string }>(
  items: T[],
  direction: SortDirection
): T[] {
  const sign = direction === 'desc' ? -1 : 1

  return [...items].sort(
    (left, right) => sign * (Date.parse(left.UpdatedAt) - Date.parse(right.UpdatedAt))
  )
}
