import { newStory, normaliseStory, validateStory, type Story } from './model'
import type { StoryRepository } from './repository'

/** Application service for stories. */
export interface StoryService {
  create(story: Story): Promise<Story>
  get(id: string): Promise<Story>
  list(): Promise<Story[]>
  update(story: Story): Promise<Story>
  delete(id: string): Promise<void>
}

/** Creates a StoryService backed by the given repository. */
export function newStoryService(repo: StoryRepository): StoryService {
  return {
    async create(story) {
      const created = newStory(story.topic, story.titles, story.tags, story.text)
      return repo.create(created)
    },
    async get(id) {
      return repo.get(id)
    },
    async list() {
      return repo.list()
    },
    async update(story) {
      // No read before write: the repository reports a missing story (ADR-0003).
      const normalised = normaliseStory(story)
      validateStory(normalised)
      return repo.update(normalised)
    },
    async delete(id) {
      return repo.delete(id)
    }
  }
}
