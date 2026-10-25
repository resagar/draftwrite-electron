import { jest } from '@jest/globals'
import type { PostRepository } from './repository'

/** Test double of the post repository port, programmable per test. */
export interface FakePostRepository extends PostRepository {
  create: jest.Mock<PostRepository['create']>
  get: jest.Mock<PostRepository['get']>
  list: jest.Mock<PostRepository['list']>
  update: jest.Mock<PostRepository['update']>
  delete: jest.Mock<PostRepository['delete']>
}

/** Creates a fresh fake so tests never share mock state. */
export function newFakePostRepository(): FakePostRepository {
  return {
    create: jest.fn<PostRepository['create']>(),
    get: jest.fn<PostRepository['get']>(),
    list: jest.fn<PostRepository['list']>(),
    update: jest.fn<PostRepository['update']>(),
    delete: jest.fn<PostRepository['delete']>()
  }
}
