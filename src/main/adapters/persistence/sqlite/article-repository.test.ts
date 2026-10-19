import { describe, expect, it } from '@jest/globals'
import { openDatabase, type AppDatabase } from '../../../db'
import { newArticle } from '../../../article/model'
import { errNotFound, errTitleTaken } from '../../../article/repository'
import { newStory, type Story } from '../../../story/model'
import { newArticleRepository } from './article-repository'
import { newStoryRepository } from './story-repository'

/** Isolated, migrated in-memory database; a fresh one per test. */
function newTestDB(): AppDatabase {
  return openDatabase(':memory:')
}

/** Creates a story row to parent articles in tests. */
async function newTestStory(db: AppDatabase, topic: string): Promise<Story> {
  return newStoryRepository(db).create(newStory(topic, [`${topic} title`], [], `${topic} text`))
}

describe('articleRepository', () => {
  it('creates an article and reads it back', async () => {
    const db = newTestDB()
    const repo = newArticleRepository(db)
    const story = await newTestStory(db, 'round trip')
    const input = newArticle(
      story.id,
      'First draft',
      'A subtitle',
      'Target audience',
      'Article text.'
    )

    const created = await repo.create(input)

    expect(created.id).toBe(input.id)
    expect(created.storyID).toBe(input.storyID)
    expect(created.title).toBe(input.title)
    expect(created.subtitle).toBe(input.subtitle)
    expect(created.target).toBe(input.target)
    expect(created.text).toBe(input.text)
    expect(created.createdAt).not.toBe('')
    expect(created.updatedAt).not.toBe('')
    expect(Number.isNaN(Date.parse(created.createdAt))).toBe(false)
    expect(Number.isNaN(Date.parse(created.updatedAt))).toBe(false)

    const got = await repo.get(created.id)

    expect(got).toEqual(created)
  })

  it('lists the articles of a story', async () => {
    const db = newTestDB()
    const repo = newArticleRepository(db)
    const storyOne = await newTestStory(db, 'story one')
    const storyTwo = await newTestStory(db, 'story two')

    const titlesOne = ['alpha', 'beta']
    for (const title of titlesOne) {
      await repo.create(newArticle(storyOne.id, title, 'subtitle', 'target', 'text'))
    }
    await repo.create(newArticle(storyTwo.id, 'gamma', 'subtitle', 'target', 'text'))

    const got = await repo.listByStory(storyOne.id)

    expect(got).toHaveLength(titlesOne.length)
    for (const article of got) {
      expect(article.storyID).toBe(storyOne.id)
    }
  })

  it('lists every article', async () => {
    const db = newTestDB()
    const repo = newArticleRepository(db)
    const story = await newTestStory(db, 'global list')
    const titles = ['one', 'two', 'three']
    for (const title of titles) {
      await repo.create(newArticle(story.id, title, 'subtitle', 'target', 'text'))
    }

    const all = await repo.list()

    expect(all).toHaveLength(titles.length)
  })

  it('updates an article and refreshes updated_at', async () => {
    const db = newTestDB()
    const repo = newArticleRepository(db)
    const story = await newTestStory(db, 'update')
    const created = await repo.create(
      newArticle(story.id, 'before', 'before sub', 'before target', 'before text')
    )

    const updated = await repo.update({
      ...created,
      title: 'after',
      subtitle: 'after sub',
      target: 'after target',
      text: 'after text'
    })

    expect(updated.title).toBe('after')
    expect(updated.subtitle).toBe('after sub')
    expect(updated.target).toBe('after target')
    expect(updated.text).toBe('after text')
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.updatedAt))

    const got = await repo.get(created.id)

    expect(got.title).toBe('after')
    expect(got.text).toBe('after text')
  })

  it('fails to get a missing article', async () => {
    const repo = newArticleRepository(newTestDB())

    await expect(repo.get('no-such-id')).rejects.toBe(errNotFound)
  })

  it('fails to update a missing article', async () => {
    const repo = newArticleRepository(newTestDB())
    const ghost = { ...newArticle('story-id', 'ghost', 'sub', 'target', 'text'), id: 'no-such-id' }

    await expect(repo.update(ghost)).rejects.toBe(errNotFound)
  })

  it('rejects a duplicated title in the same story', async () => {
    const db = newTestDB()
    const repo = newArticleRepository(db)
    const story = await newTestStory(db, 'duplicate title')
    await repo.create(newArticle(story.id, 'Same title', 'sub one', 'target', 'text'))

    await expect(
      repo.create(newArticle(story.id, 'Same title', 'sub two', 'target', 'text'))
    ).rejects.toBe(errTitleTaken)
  })

  it('allows the same title in a different story', async () => {
    const db = newTestDB()
    const repo = newArticleRepository(db)
    const storyOne = await newTestStory(db, 'story one')
    const storyTwo = await newTestStory(db, 'story two')
    await repo.create(newArticle(storyOne.id, 'Same title', 'sub one', 'target', 'text'))

    await repo.create(newArticle(storyTwo.id, 'Same title', 'sub two', 'target', 'text'))
  })

  it('deletes an article and stays silent for a missing id', async () => {
    const db = newTestDB()
    const repo = newArticleRepository(db)
    const story = await newTestStory(db, 'delete')
    const created = await repo.create(newArticle(story.id, 'doomed', 'sub', 'target', 'text'))

    await repo.delete(created.id)

    await expect(repo.get(created.id)).rejects.toBe(errNotFound)

    // Deleting a non-existent id is silent.
    await expect(repo.delete(created.id)).resolves.toBeUndefined()
  })

  it('deletes the articles with their story', async () => {
    const db = newTestDB()
    const articleRepo = newArticleRepository(db)
    const storyRepo = newStoryRepository(db)
    const story = await storyRepo.create(newStory('cascade', ['title'], [], 'text'))
    const created = await articleRepo.create(
      newArticle(story.id, 'cascaded', 'sub', 'target', 'text')
    )

    await storyRepo.delete(story.id)

    await expect(articleRepo.get(created.id)).rejects.toBe(errNotFound)
  })
})
