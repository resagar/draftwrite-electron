import { jest } from '@jest/globals'
import type { ArticleRepository } from './repository'

/** Test double of the article repository port, programmable per test. */
export interface FakeArticleRepository extends ArticleRepository {
  create: jest.Mock<ArticleRepository['create']>
  get: jest.Mock<ArticleRepository['get']>
  listByStory: jest.Mock<ArticleRepository['listByStory']>
  list: jest.Mock<ArticleRepository['list']>
  update: jest.Mock<ArticleRepository['update']>
  delete: jest.Mock<ArticleRepository['delete']>
}

/** Creates a fresh fake so tests never share mock state. */
export function newFakeArticleRepository(): FakeArticleRepository {
  return {
    create: jest.fn<ArticleRepository['create']>(),
    get: jest.fn<ArticleRepository['get']>(),
    listByStory: jest.fn<ArticleRepository['listByStory']>(),
    list: jest.fn<ArticleRepository['list']>(),
    update: jest.fn<ArticleRepository['update']>(),
    delete: jest.fn<ArticleRepository['delete']>()
  }
}
