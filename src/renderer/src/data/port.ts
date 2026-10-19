import type { Article, Story } from './types'

export type NewStory = {
  topic: string
  titles: string[]
  tags: string[]
  text: string
}

export type NewArticle = {
  storyId: string
  title: string
  subtitle: string
  target: string
  text: string
}

export type DataPort = {
  listStories(): Promise<Story[]>
  listArticles(): Promise<Article[]>
  createStory(input: NewStory): Promise<Story>
  updateStory(story: Story): Promise<Story>
  createArticle(input: NewArticle): Promise<Article>
  updateArticle(article: Article): Promise<Article>
  deleteStory(id: string): Promise<void>
  deleteArticle(id: string): Promise<void>
}
