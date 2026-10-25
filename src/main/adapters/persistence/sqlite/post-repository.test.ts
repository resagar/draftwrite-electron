import { beforeEach, describe, expect, it } from '@jest/globals'
import { eq } from 'drizzle-orm'
import type { Post } from '../../../post/model'
import { errNotFound } from '../../../post/repository'
import { openDatabase, type AppDatabase } from '../../../db'
import { newPostRepository } from './post-repository'
import { articles, posts, stories } from './schema'

const basePost: Post = {
  id: 'post-1',
  topic: 'Launch note',
  text: 'Short body',
  state: 'pending',
  scheduledAt: null,
  storyID: null,
  articleID: null,
  createdAt: '',
  updatedAt: ''
}

let db: AppDatabase

beforeEach(() => {
  db = openDatabase(':memory:')
})

function insertStory(id: string): void {
  db.insert(stories)
    .values({ id, topic: `topic-${id}`, titles: '', text: '' })
    .run()
}

function insertArticle(id: string, storyID: string): void {
  db.insert(articles)
    .values({ id, storyID, title: `title-${id}`, subtitle: '', target: '', text: '' })
    .run()
}

describe('postRepository', () => {
  it('creates a post and returns the stored timestamps', async () => {
    const repo = newPostRepository(db)

    const created = await repo.create(basePost)

    expect(created.id).toBe('post-1')
    expect(created.topic).toBe('Launch note')
    expect(created.text).toBe('Short body')
    expect(created.state).toBe('pending')
    expect(created.createdAt).not.toBe('')
    expect(created.updatedAt).not.toBe('')
  })

  it('reads a post by id and reports a missing one', async () => {
    const repo = newPostRepository(db)
    const created = await repo.create(basePost)

    await expect(repo.get('post-1')).resolves.toEqual(created)
    await expect(repo.get('missing')).rejects.toBe(errNotFound)
  })

  it('lists every post', async () => {
    const repo = newPostRepository(db)
    await repo.create(basePost)
    await repo.create({ ...basePost, id: 'post-2', topic: 'Second' })

    const all = await repo.list()

    expect(all.map((post) => post.id).sort()).toEqual(['post-1', 'post-2'])
  })

  it('updates the stored values and leaves created_at alone', async () => {
    const repo = newPostRepository(db)
    const created = await repo.create(basePost)

    const updated = await repo.update({
      ...created,
      topic: 'Updated',
      text: 'New body',
      state: 'scheduled',
      scheduledAt: '2026-11-01T10:00'
    })

    expect(updated.topic).toBe('Updated')
    expect(updated.text).toBe('New body')
    expect(updated.state).toBe('scheduled')
    expect(updated.scheduledAt).toBe('2026-11-01T10:00')
    expect(updated.createdAt).toBe(created.createdAt)
  })

  it('stores an absent scheduled date as null', async () => {
    const repo = newPostRepository(db)
    const created = await repo.create({
      ...basePost,
      state: 'scheduled',
      scheduledAt: '2026-11-01T10:00'
    })

    const cleared = await repo.update({ ...created, state: 'pending', scheduledAt: null })

    expect(cleared.scheduledAt).toBeNull()
  })

  it('reports not found when updating a missing post', async () => {
    const repo = newPostRepository(db)

    await expect(repo.update({ ...basePost, id: 'missing' })).rejects.toBe(errNotFound)
  })

  it('rejects an unknown state at the database level', () => {
    expect(() =>
      db.insert(posts).values({ id: 'post-3', topic: 'Topic', text: '', state: 'archived' }).run()
    ).toThrow()
  })

  it('stores a story source and clears it when the story is deleted', async () => {
    const repo = newPostRepository(db)
    insertStory('s1')

    const created = await repo.create({ ...basePost, storyID: 's1' })

    expect(created.storyID).toBe('s1')
    expect(created.articleID).toBeNull()

    db.delete(stories).where(eq(stories.id, 's1')).run()

    const after = await repo.get(created.id)
    expect(after.storyID).toBeNull()
  })

  it('stores an article source and clears it when the article is deleted', async () => {
    const repo = newPostRepository(db)
    insertStory('s1')
    insertArticle('a1', 's1')

    const created = await repo.create({ ...basePost, articleID: 'a1' })

    expect(created.articleID).toBe('a1')
    expect(created.storyID).toBeNull()

    db.delete(articles).where(eq(articles.id, 'a1')).run()

    const after = await repo.get(created.id)
    expect(after.articleID).toBeNull()
  })

  it('rejects a post with a story and an article at the database level', () => {
    insertStory('s1')
    insertArticle('a1', 's1')

    expect(() =>
      db
        .insert(posts)
        .values({
          id: 'post-4',
          topic: 'Topic',
          text: '',
          state: 'pending',
          storyID: 's1',
          articleID: 'a1'
        })
        .run()
    ).toThrow()
  })

  it('deletes a post and stays silent for a missing id', async () => {
    const repo = newPostRepository(db)
    await repo.create(basePost)

    await repo.delete('post-1')

    await expect(repo.get('post-1')).rejects.toBe(errNotFound)
    await expect(repo.delete('missing')).resolves.toBeUndefined()
  })
})
