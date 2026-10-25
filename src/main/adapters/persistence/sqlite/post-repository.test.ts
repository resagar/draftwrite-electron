import { beforeEach, describe, expect, it } from '@jest/globals'
import type { Post } from '../../../post/model'
import { errNotFound } from '../../../post/repository'
import { openDatabase, type AppDatabase } from '../../../db'
import { newPostRepository } from './post-repository'
import { posts } from './schema'

const basePost: Post = {
  id: 'post-1',
  topic: 'Launch note',
  text: 'Short body',
  state: 'pending',
  scheduledAt: null,
  createdAt: '',
  updatedAt: ''
}

let db: AppDatabase

beforeEach(() => {
  db = openDatabase(':memory:')
})

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
})
