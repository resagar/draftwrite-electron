import type { Article, Story } from './types'

export function emptyStory(): Story {
  return { ID: '', Topic: '', Titles: [], Tags: [], Text: '', CreatedAt: '', UpdatedAt: '' }
}

export function emptyArticle(storyId: string): Article {
  return {
    ID: '',
    StoryID: storyId,
    Title: '',
    Subtitle: '',
    Target: '',
    Text: '',
    CreatedAt: '',
    UpdatedAt: ''
  }
}
