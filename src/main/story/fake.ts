import { jest } from '@jest/globals'
import type { StoryRepository } from './repository'

/** Test double of the story repository port, programmable per test. */
export interface FakeStoryRepository extends StoryRepository {
  create: jest.Mock<StoryRepository['create']>
  get: jest.Mock<StoryRepository['get']>
  list: jest.Mock<StoryRepository['list']>
  update: jest.Mock<StoryRepository['update']>
  delete: jest.Mock<StoryRepository['delete']>
}

/** Creates a fresh fake so tests never share mock state. */
export function newFakeStoryRepository(): FakeStoryRepository {
  return {
    create: jest.fn<StoryRepository['create']>(),
    get: jest.fn<StoryRepository['get']>(),
    list: jest.fn<StoryRepository['list']>(),
    update: jest.fn<StoryRepository['update']>(),
    delete: jest.fn<StoryRepository['delete']>()
  }
}
