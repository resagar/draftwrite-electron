import { errNotFound as storyErrNotFound, type StoryRepository } from '../story/repository'
import {
  errStoryIDImmutable,
  newArticle,
  normaliseArticle,
  validateArticle,
  type Article
} from './model'
import type { ArticleRepository } from './repository'

function domainError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code })
}

/** Returned when the parent story of an article does not exist. */
export const errStoryNotFound = domainError('errStoryNotFound', 'article story not found')

/** Port for article use cases. */
export interface ArticleService {
  create(article: Article): Promise<Article>
  get(id: string): Promise<Article>
  listByStory(storyID: string): Promise<Article[]>
  list(): Promise<Article[]>
  update(article: Article): Promise<Article>
  delete(id: string): Promise<void>
}

/**
 * Creates an ArticleService backed by the given repositories. `storyRepo`
 * verifies the parent story on create.
 */
export function newArticleService(
  repo: ArticleRepository,
  storyRepo: StoryRepository
): ArticleService {
  return {
    async create(article) {
      const created = newArticle(
        article.storyID,
        article.title,
        article.subtitle,
        article.target,
        article.text
      )
      try {
        await storyRepo.get(created.storyID)
      } catch (error) {
        if (error === storyErrNotFound) {
          throw errStoryNotFound
        }
        throw error
      }
      return repo.create(created)
    },
    async get(id) {
      return repo.get(id)
    },
    async listByStory(storyID) {
      return repo.listByStory(storyID)
    },
    async list() {
      return repo.list()
    },
    async update(article) {
      const normalised = normaliseArticle(article)
      validateArticle(normalised)
      const stored = await repo.get(normalised.id)
      if (normalised.storyID !== stored.storyID) {
        throw errStoryIDImmutable
      }
      return repo.update(normalised)
    },
    async delete(id) {
      return repo.delete(id)
    }
  }
}
