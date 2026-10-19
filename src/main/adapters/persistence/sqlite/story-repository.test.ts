import { describe, expect, it } from '@jest/globals'
import { openDatabase, type AppDatabase } from '../../../db'
import { newStory } from '../../../story/model'
import { errNotFound, errTopicTaken } from '../../../story/repository'
import { newStoryRepository } from './story-repository'

/** Isolated, migrated in-memory database; a fresh one per test. */
function newTestDB(): AppDatabase {
  return openDatabase(':memory:')
}

describe('storyRepository', () => {
  it('creates a story and reads it back', async () => {
    const repo = newStoryRepository(newTestDB())
    const input = newStory(
      'space opera',
      ['First draft', 'Final draft'],
      ['novel', 'scifi'],
      'A story about space.'
    )

    const created = await repo.create(input)

    expect(created.id).toBe(input.id)
    expect(created.createdAt).not.toBe('')
    expect(created.updatedAt).not.toBe('')
    expect(Number.isNaN(Date.parse(created.createdAt))).toBe(false)
    expect(Number.isNaN(Date.parse(created.updatedAt))).toBe(false)

    const got = await repo.get(created.id)

    expect(got.id).toBe(created.id)
    expect(got.topic).toBe(input.topic)
    expect(got.text).toBe(input.text)
    expect(got.titles).toEqual(input.titles)
    expect(got.tags).toEqual(input.tags)
  })

  it('normalises the CSV lists', async () => {
    const repo = newStoryRepository(newTestDB())
    const input = newStory(
      'csv normalization',
      ['  padded title  ', '', 'middle', ''],
      [' tag one ', 'tag two'],
      'body'
    )

    const created = await repo.create(input)
    const got = await repo.get(created.id)

    expect(got.titles).toEqual(['padded title', 'middle'])
    expect(got.tags).toEqual(['tag one', 'tag two'])
  })

  it('round-trips empty lists as empty arrays', async () => {
    const repo = newStoryRepository(newTestDB())
    const input = newStory('empty lists', [], [], '')

    const created = await repo.create(input)
    const got = await repo.get(created.id)

    expect(got.titles).toEqual([])
    expect(got.tags).toEqual([])
  })

  it('lists every story', async () => {
    const repo = newStoryRepository(newTestDB())
    const topics = ['alpha', 'beta', 'gamma']
    for (const topic of topics) {
      await repo.create(newStory(topic, [`${topic} title`], [`${topic} tag`], `${topic} text`))
    }

    const all = await repo.list()

    expect(all).toHaveLength(topics.length)
    for (const topic of topics) {
      expect(all.some((story) => story.topic === topic)).toBe(true)
    }
    for (const story of all) {
      expect(story.titles).toEqual([`${story.topic} title`])
    }
  })

  it('updates a story and refreshes updated_at', async () => {
    const repo = newStoryRepository(newTestDB())
    const created = await repo.create(newStory('before', ['old title'], ['old tag'], 'old text'))

    // Update takes the whole entity with its existing ID; the constructor
    // generates IDs for new entities, so reassign it here.
    const updated = await repo.update({
      ...newStory('after', ['new title one', 'new title two'], ['new tag'], 'new text'),
      id: created.id
    })

    expect(updated.topic).toBe('after')
    expect(updated.text).toBe('new text')
    expect(updated.titles).toEqual(['new title one', 'new title two'])
    expect(updated.tags).toEqual(['new tag'])
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.updatedAt))

    const got = await repo.get(created.id)

    expect(got.topic).toBe('after')
    expect(got.text).toBe('new text')
  })

  it('fails to get a missing story', async () => {
    const repo = newStoryRepository(newTestDB())

    await expect(repo.get('no-such-id')).rejects.toBe(errNotFound)
  })

  it('fails to update a missing story', async () => {
    const repo = newStoryRepository(newTestDB())
    const ghost = { ...newStory('ghost', ['t'], ['g'], 'text'), id: 'no-such-id' }

    await expect(repo.update(ghost)).rejects.toBe(errNotFound)
  })

  it('rejects a duplicated topic', async () => {
    const repo = newStoryRepository(newTestDB())
    await repo.create(newStory('duplicated', ['a'], ['b'], 'one'))

    await expect(repo.create(newStory('duplicated', ['c'], ['d'], 'two'))).rejects.toBe(
      errTopicTaken
    )
  })

  it('deletes a story and stays silent for a missing id', async () => {
    const repo = newStoryRepository(newTestDB())
    const created = await repo.create(newStory('doomed', ['t'], ['g'], 'text'))

    await repo.delete(created.id)

    await expect(repo.get(created.id)).rejects.toBe(errNotFound)

    // Deleting a non-existent id is silent.
    await expect(repo.delete(created.id)).resolves.toBeUndefined()
  })
})
