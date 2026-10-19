import type { Article, Story } from '../types'

export function makeStory(overrides: Partial<Story> = {}): Story {
  return {
    ID: 'story-1',
    Topic: 'A topic',
    Titles: ['A title'],
    Tags: [],
    Text: 'The story text.',
    CreatedAt: '2024-10-14T10:00:00',
    UpdatedAt: '2024-10-14T10:00:00',
    ...overrides
  }
}

export function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    ID: 'article-1',
    StoryID: 'story-1',
    Title: 'An article',
    Subtitle: 'A subtitle',
    Target: 'A target',
    Text: 'The article text.',
    CreatedAt: '2024-10-14T10:00:00',
    UpdatedAt: '2024-10-14T10:00:00',
    ...overrides
  }
}
