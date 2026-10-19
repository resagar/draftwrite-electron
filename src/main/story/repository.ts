import type { Story } from './model'

function domainError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code })
}

/** Returned when a story does not exist. */
export const errNotFound = domainError('errNotFound', 'story not found')

/** Returned when a story topic is already in use. */
export const errTopicTaken = domainError('errTopicTaken', 'story topic already taken')

/**
 * Port for story persistence.
 *
 * `create` persists the story and returns the stored entity with
 * createdAt/updatedAt from the database. The caller (the application service)
 * is responsible for generating the ID.
 */
export interface StoryRepository {
  create(story: Story): Promise<Story>
  get(id: string): Promise<Story>
  list(): Promise<Story[]>
  update(story: Story): Promise<Story>
  delete(id: string): Promise<void>
}
