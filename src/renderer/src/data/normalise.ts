import type { ArticleDTO, StoryDTO } from '../../../main/adapters/ipc/contract'
import type { Article, Story } from './types'

export function toStory(wire: StoryDTO): Story {
  return {
    ID: wire.id,
    Topic: wire.topic,
    Titles: wire.titles ?? [],
    Tags: wire.tags ?? [],
    Text: wire.text,
    CreatedAt: wire.createdAt,
    UpdatedAt: wire.updatedAt
  }
}

export function toStories(wire: StoryDTO[]): Story[] {
  return (wire ?? []).map(toStory)
}

export function toArticle(wire: ArticleDTO): Article {
  return {
    ID: wire.id,
    StoryID: wire.storyID,
    Title: wire.title,
    Subtitle: wire.subtitle,
    Target: wire.target,
    Text: wire.text,
    CreatedAt: wire.createdAt,
    UpdatedAt: wire.updatedAt
  }
}

export function toArticles(wire: ArticleDTO[]): Article[] {
  return (wire ?? []).map(toArticle)
}
