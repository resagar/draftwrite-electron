import { describe, expect, it } from '@jest/globals'
import { newFakePostRepository, type FakePostRepository } from './fake'
import { errTopicRequired, type Post } from './model'
import { errNotFound } from './repository'
import { newPostService, type PostService } from './service'

const emptyPost: Post = {
  id: '',
  topic: '',
  text: '',
  state: 'pending',
  scheduledAt: null,
  createdAt: '',
  updatedAt: ''
}

interface ServiceUnderTest {
  service: PostService
  repo: FakePostRepository
}

function newServiceUnderTest(): ServiceUnderTest {
  const repo = newFakePostRepository()
  return { service: newPostService(repo), repo }
}

describe('postService', () => {
  it('creates a pending post with the given values', async () => {
    const { service, repo } = newServiceUnderTest()
    repo.create.mockImplementation(async (post) => {
      expect(post.id).not.toBe('')
      expect(post.topic).toBe('Launch note')
      expect(post.text).toBe('Short body')
      expect(post.state).toBe('pending')
      return {
        ...post,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z'
      }
    })

    const created = await service.create({
      ...emptyPost,
      topic: '  Launch note  ',
      text: '  Short body  ',
      state: 'published'
    })

    expect(created.id).not.toBe('')
    expect(created.topic).toBe('Launch note')
    expect(created.text).toBe('Short body')
    expect(created.state).toBe('pending')
    expect(repo.create).toHaveBeenCalledTimes(1)
  })

  it('rejects a blank topic without touching the repository', async () => {
    const { service, repo } = newServiceUnderTest()

    await expect(service.create({ ...emptyPost, topic: '   ' })).rejects.toBe(errTopicRequired)

    expect(repo.create).not.toHaveBeenCalled()
  })

  it('gets a post by id', async () => {
    const { service, repo } = newServiceUnderTest()
    const want = { ...emptyPost, id: 'id-1', topic: 'Launch note' }
    repo.get.mockResolvedValue(want)

    const got = await service.get('id-1')

    expect(got).toEqual(want)
    expect(repo.get).toHaveBeenCalledWith('id-1')
  })

  it('propagates not found on get', async () => {
    const { service, repo } = newServiceUnderTest()
    repo.get.mockRejectedValue(errNotFound)

    await expect(service.get('missing')).rejects.toBe(errNotFound)
  })

  it('lists every post', async () => {
    const { service, repo } = newServiceUnderTest()
    const want = [
      { ...emptyPost, id: 'id-1', topic: 'a' },
      { ...emptyPost, id: 'id-2', topic: 'b' }
    ]
    repo.list.mockResolvedValue(want)

    const got = await service.list()

    expect(got).toEqual(want)
    expect(repo.list).toHaveBeenCalledTimes(1)
  })

  it('updates a post with trimmed values', async () => {
    const { service, repo } = newServiceUnderTest()
    const stored = { ...emptyPost, id: 'id-1', topic: 'Old' }
    repo.update.mockImplementation(async (post) => {
      expect(post.topic).toBe('Launch note')
      expect(post.text).toBe('Short body')
      return { ...stored, topic: post.topic, text: post.text }
    })

    await service.update({
      ...stored,
      topic: '  Launch note  ',
      text: '  Short body  '
    })

    expect(repo.update).toHaveBeenCalledTimes(1)
  })

  it('rejects an invalid post on update without touching the repository', async () => {
    const { service, repo } = newServiceUnderTest()

    await expect(service.update({ ...emptyPost, id: 'id-1', topic: '  ' })).rejects.toBe(
      errTopicRequired
    )

    expect(repo.update).not.toHaveBeenCalled()
  })

  it('drops the scheduled date when the post stops being scheduled', async () => {
    const { service, repo } = newServiceUnderTest()
    repo.update.mockImplementation(async (post) => post)

    await service.update({
      ...emptyPost,
      id: 'id-1',
      topic: 'Launch',
      state: 'published',
      scheduledAt: '2026-11-01T10:00'
    })

    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'published', scheduledAt: null })
    )
  })

  it('propagates not found on update', async () => {
    const { service, repo } = newServiceUnderTest()
    repo.update.mockRejectedValue(errNotFound)

    await expect(service.update({ ...emptyPost, id: 'missing', topic: 'Launch' })).rejects.toBe(
      errNotFound
    )
  })
})
