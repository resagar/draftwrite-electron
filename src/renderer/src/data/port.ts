import type { Article, Post, Story } from './types'

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

export type NewPost = {
  topic: string
  text: string
  storyId: string | null
  articleId: string | null
}

export type DataPort = {
  listStories(): Promise<Story[]>
  listArticles(): Promise<Article[]>
  listPosts(): Promise<Post[]>
  createStory(input: NewStory): Promise<Story>
  updateStory(story: Story): Promise<Story>
  createArticle(input: NewArticle): Promise<Article>
  updateArticle(article: Article): Promise<Article>
  createPost(input: NewPost): Promise<Post>
  updatePost(post: Post): Promise<Post>
  deleteStory(id: string): Promise<void>
  deleteArticle(id: string): Promise<void>
}
