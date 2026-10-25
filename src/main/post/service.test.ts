import { describe, expect, it } from '@jest/globals'
import { newFakeArticleRepository, type FakeArticleRepository } from '../article/fake'
import { errNotFound as articleErrNotFound } from '../article/repository'
import type { Article } from '../article/model'
import { newFakeStoryRepository, type FakeStoryRepository } from '../story/fake'
import type { Story } from '../story/model'
import { errNotFound as storyErrNotFound } from '../story/repository'
import { newFakePostRepository, type FakePostRepository } from './fake'
import { errSourceLocked, errTopicRequired, type Post } from './model'
import { errNotFound } from './repository'
import { errSourceNotFound, newPostService, type PostService } from './service'

const emptyPost: Post = {
  id: '',
  topic: '',
  text: '',
  state: 'pending',
  scheduledAt: null,
  storyID: null,
  articleID: null,
  createdAt: '',
  updatedAt: ''
}

const emptyStory: Story = {
  id: '',
  topic: '',
  titles: [],
  tags: [],
  text: '',
  createdAt: '',
  updatedAt: ''
}

const emptyArticle: Article = {
  id: '',
  storyID: '',
  title: '',
  subtitle: '',
  target: '',
  text: '',
  createdAt: '',
  updatedAt: ''
}

interface ServiceUnderTest {
  service: PostService
  repo: FakePostRepository
  storyRepo: FakeStoryRepository
  articleRepo: FakeArticleRepository
}

function newServiceUnderTest(): ServiceUnderTest {
  const repo = newFakePostRepository()
  const storyRepo = newFakeStoryRepository()
  const articleRepo = newFakeArticleRepository()
  return { service: newPostService(repo, storyRepo, articleRepo), repo, storyRepo, articleRepo }
}

describe('postService', () => {
  it('creates a pending post with the given values', async () => {
    const { service, repo } = newServiceUnderTest()
    repo.create.mockImplementation(async (post) => {
      expect(post.id).not.toBe('')
      expect(post.topic).toBe('Launch note')
      expect(post.text).toBe('Short body')
      expect(post.state).toBe('pending')
      expect(post.storyID).toBeNull()
      expect(post.articleID).toBeNull()
      return {
        ...post,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z'
      }
    })

    const created = await service.create({
      ...emptyPost,
      topic: '  Launch note  ',
      text: '  Short body  '
    })

    expect(created.id).not.toBe('')
    expect(created.topic).toBe('Launch note')
    expect(created.state).toBe('pending')
    expect(repo.create).toHaveBeenCalledTimes(1)
  })

  it('creates a post that points at an existing story', async () => {
    const { service, repo, storyRepo } = newServiceUnderTest()
    storyRepo.get.mockResolvedValue({ ...emptyStory, id: 's1', topic: 'Calm software' })
    repo.create.mockImplementation(async (post) => post)

    const created = await service.create({ ...emptyPost, topic: 'Launch', storyID: 's1' })

    expect(created.storyID).toBe('s1')
    expect(storyRepo.get).toHaveBeenCalledWith('s1')
    expect(repo.create).toHaveBeenCalledTimes(1)
  })

  it('creates a post that points at an existing article', async () => {
    const { service, repo, articleRepo } = newServiceUnderTest()
    articleRepo.get.mockResolvedValue({ ...emptyArticle, id: 'a1', title: 'Calm' })
    repo.create.mockImplementation(async (post) => post)

    const created = await service.create({ ...emptyPost, topic: 'Launch', articleID: 'a1' })

    expect(created.articleID).toBe('a1')
    expect(articleRepo.get).toHaveBeenCalledWith('a1')
    expect(repo.create).toHaveBeenCalledTimes(1)
  })

  it('fails when the source does not exist', async () => {
    const { service, repo, storyRepo, articleRepo } = newServiceUnderTest()
    storyRepo.get.mockRejectedValue(storyErrNotFound)
    articleRepo.get.mockRejectedValue(articleErrNotFound)

    await expect(service.create({ ...emptyPost, topic: 'Launch', storyID: 'gone' })).rejects.toBe(
      errSourceNotFound
    )
    await expect(service.create({ ...emptyPost, topic: 'Launch', articleID: 'gone' })).rejects.toBe(
      errSourceNotFound
    )

    expect(repo.create).not.toHaveBeenCalled()
  })

  it('rejects a blank topic without touching the repositories', async () => {
    const { service, repo, storyRepo } = newServiceUnderTest()

    await expect(service.create({ ...emptyPost, topic: '   ' })).rejects.toBe(errTopicRequired)

    expect(repo.create).not.toHaveBeenCalled()
    expect(storyRepo.get).not.toHaveBeenCalled()
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
    repo.get.mockResolvedValue(stored)
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

  it('drops the scheduled date when the post stops being scheduled', async () => {
    const { service, repo } = newServiceUnderTest()
    const stored: Post = { ...emptyPost, id: 'id-1', topic: 'Launch', state: 'scheduled' }
    repo.get.mockResolvedValue(stored)
    repo.update.mockImplementation(async (post) => post)

    await service.update({
      ...stored,
      state: 'published',
      scheduledAt: '2026-11-01T10:00'
    })

    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'published', scheduledAt: null })
    )
  })

  it('rejects an invalid post on update without reading it', async () => {
    const { service, repo } = newServiceUnderTest()

    await expect(service.update({ ...emptyPost, id: 'id-1', topic: '  ' })).rejects.toBe(
      errTopicRequired
    )

    expect(repo.get).not.toHaveBeenCalled()
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('propagates not found on update', async () => {
    const { service, repo } = newServiceUnderTest()
    repo.get.mockRejectedValue(errNotFound)

    await expect(service.update({ ...emptyPost, id: 'missing', topic: 'Launch' })).rejects.toBe(
      errNotFound
    )
  })

  it('changes the source while the post is pending', async () => {
    const { service, repo, storyRepo } = newServiceUnderTest()
    const stored = { ...emptyPost, id: 'id-1', topic: 'Launch' }
    repo.get.mockResolvedValue(stored)
    storyRepo.get.mockResolvedValue({ ...emptyStory, id: 's1' })
    repo.update.mockImplementation(async (post) => post)

    const updated = await service.update({ ...stored, storyID: 's1' })

    expect(updated.storyID).toBe('s1')
    expect(storyRepo.get).toHaveBeenCalledWith('s1')
  })

  it('locks the source once the post is not pending', async () => {
    const { service, repo, storyRepo } = newServiceUnderTest()
    const stored: Post = { ...emptyPost, id: 'id-1', topic: 'Launch', state: 'scheduled' }
    repo.get.mockResolvedValue(stored)

    await expect(service.update({ ...stored, storyID: 's1' })).rejects.toBe(errSourceLocked)

    expect(storyRepo.get).not.toHaveBeenCalled()
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('does not verify the source when it did not change', async () => {
    const { service, repo, storyRepo } = newServiceUnderTest()
    const stored = { ...emptyPost, id: 'id-1', topic: 'Launch', storyID: 's1' }
    repo.get.mockResolvedValue(stored)
    repo.update.mockImplementation(async (post) => post)

    await service.update({ ...stored, topic: 'New topic' })

    expect(storyRepo.get).not.toHaveBeenCalled()
    expect(repo.update).toHaveBeenCalledTimes(1)
  })

  it('deletes a post', async () => {
    const { service, repo } = newServiceUnderTest()
    repo.delete.mockResolvedValue(undefined)

    await service.delete('id-1')

    expect(repo.delete).toHaveBeenCalledWith('id-1')
  })

  it('propagates not found on delete', async () => {
    const { service, repo } = newServiceUnderTest()
    repo.delete.mockRejectedValue(errNotFound)

    await expect(service.delete('missing')).rejects.toBe(errNotFound)
  })
})
