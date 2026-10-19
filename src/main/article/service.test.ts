import { describe, expect, it } from '@jest/globals'
import { newFakeStoryRepository, type FakeStoryRepository } from '../story/fake'
import type { Story } from '../story/model'
import { errNotFound as storyErrNotFound } from '../story/repository'
import { newFakeArticleRepository, type FakeArticleRepository } from './fake'
import {
  errStoryIDImmutable,
  errStoryIDRequired,
  errTitleRequired,
  errTitleTooLong,
  type Article
} from './model'
import { errNotFound, errTitleTaken } from './repository'
import { errStoryNotFound, newArticleService, type ArticleService } from './service'

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

const emptyStory: Story = {
  id: '',
  topic: '',
  titles: [],
  tags: [],
  text: '',
  createdAt: '',
  updatedAt: ''
}

interface ServiceUnderTest {
  service: ArticleService
  repo: FakeArticleRepository
  storyRepo: FakeStoryRepository
}

function newServiceUnderTest(): ServiceUnderTest {
  const repo = newFakeArticleRepository()
  const storyRepo = newFakeStoryRepository()
  return { service: newArticleService(repo, storyRepo), repo, storyRepo }
}

describe('articleService', () => {
  it('creates an article for an existing story', async () => {
    const { service, repo, storyRepo } = newServiceUnderTest()
    storyRepo.get.mockResolvedValue({ ...emptyStory, id: 'story-id-1', topic: 'topic' })
    repo.create.mockImplementation(async (article) => {
      expect(article.id).not.toBe('')
      expect(article.storyID).toBe('story-id-1')
      expect(article.title).toBe('Title')
      expect(article.subtitle).toBe('Subtitle')
      expect(article.target).toBe('Target')
      expect(article.text).toBe('Text')
      return {
        ...emptyArticle,
        id: 'generated-uuid',
        storyID: 'story-id-1',
        title: 'Title',
        subtitle: 'Subtitle',
        target: 'Target',
        text: 'Text'
      }
    })

    const created = await service.create({
      ...emptyArticle,
      storyID: 'story-id-1',
      title: 'Title',
      subtitle: 'Subtitle',
      target: 'Target',
      text: 'Text'
    })

    expect(created.id).not.toBe('')
    expect(created.storyID).toBe('story-id-1')
    expect(created.title).toBe('Title')
    expect(created.subtitle).toBe('Subtitle')
    expect(created.target).toBe('Target')
    expect(created.text).toBe('Text')
    expect(repo.create).toHaveBeenCalledTimes(1)
    expect(storyRepo.get).toHaveBeenCalledWith('story-id-1')
  })

  it('creates an article with only story and title', async () => {
    const { service, repo, storyRepo } = newServiceUnderTest()
    storyRepo.get.mockResolvedValue({ ...emptyStory, id: 'story-id-1', topic: 'topic' })
    repo.create.mockImplementation(async (article) => {
      expect(article.id).not.toBe('')
      expect(article.storyID).toBe('story-id-1')
      expect(article.title).toBe('Title')
      expect(article.subtitle).toBe('')
      expect(article.target).toBe('')
      expect(article.text).toBe('')
      return { ...emptyArticle, id: 'generated-uuid', storyID: 'story-id-1', title: 'Title' }
    })

    const created = await service.create({ ...emptyArticle, storyID: 'story-id-1', title: 'Title' })

    expect(created.id).not.toBe('')
    expect(created.title).toBe('Title')
    expect(repo.create).toHaveBeenCalledTimes(1)
    expect(storyRepo.get).toHaveBeenCalledWith('story-id-1')
  })

  it('rejects invalid input without touching the repositories', async () => {
    const { service, repo, storyRepo } = newServiceUnderTest()

    // Go subcases: story id required/blank, title required/blank and title too long.
    await expect(service.create({ ...emptyArticle, title: 'Title' })).rejects.toBe(
      errStoryIDRequired
    )
    await expect(service.create({ ...emptyArticle, storyID: '   ', title: 'Title' })).rejects.toBe(
      errStoryIDRequired
    )
    await expect(service.create({ ...emptyArticle, storyID: 'story-id-1' })).rejects.toBe(
      errTitleRequired
    )
    await expect(
      service.create({ ...emptyArticle, storyID: 'story-id-1', title: '   ' })
    ).rejects.toBe(errTitleRequired)
    await expect(
      service.create({ ...emptyArticle, storyID: 'story-id-1', title: 'a'.repeat(256) })
    ).rejects.toBe(errTitleTooLong)

    expect(repo.create).not.toHaveBeenCalled()
    expect(storyRepo.get).not.toHaveBeenCalled()
  })

  it('fails when the story does not exist without creating the article', async () => {
    const { service, repo, storyRepo } = newServiceUnderTest()
    storyRepo.get.mockRejectedValue(storyErrNotFound)

    await expect(
      service.create({ ...emptyArticle, storyID: 'missing-story', title: 'Title' })
    ).rejects.toBe(errStoryNotFound)

    expect(repo.create).not.toHaveBeenCalled()
    expect(storyRepo.get).toHaveBeenCalledWith('missing-story')
  })

  it('surfaces the error when the title is taken', async () => {
    const { service, repo, storyRepo } = newServiceUnderTest()
    storyRepo.get.mockResolvedValue({ ...emptyStory, id: 'story-id-1', topic: 'topic' })
    repo.create.mockRejectedValue(errTitleTaken)

    await expect(
      service.create({
        ...emptyArticle,
        storyID: 'story-id-1',
        title: 'Title',
        subtitle: 'Subtitle',
        target: 'Target',
        text: 'Text'
      })
    ).rejects.toBe(errTitleTaken)

    expect(repo.create).toHaveBeenCalledTimes(1)
    expect(storyRepo.get).toHaveBeenCalledWith('story-id-1')
  })

  it('gets an article by id', async () => {
    const { service, repo } = newServiceUnderTest()
    const want: Article = {
      ...emptyArticle,
      id: 'id-1',
      storyID: 'story-id-1',
      title: 'Title',
      subtitle: 'Subtitle',
      target: 'Target',
      text: 'Text'
    }
    repo.get.mockResolvedValue(want)

    const got = await service.get('id-1')

    expect(got).toEqual(want)
    expect(repo.get).toHaveBeenCalledWith('id-1')
  })

  it('propagates not found on get', async () => {
    const { service, repo } = newServiceUnderTest()
    repo.get.mockRejectedValue(errNotFound)

    await expect(service.get('missing')).rejects.toBe(errNotFound)

    expect(repo.get).toHaveBeenCalledWith('missing')
  })

  it('lists the articles of a story', async () => {
    const { service, repo } = newServiceUnderTest()
    const want: Article[] = [
      { ...emptyArticle, id: 'id-1', storyID: 'story-id-1', title: 'a' },
      { ...emptyArticle, id: 'id-2', storyID: 'story-id-1', title: 'b' }
    ]
    repo.listByStory.mockResolvedValue(want)

    const got = await service.listByStory('story-id-1')

    expect(got).toEqual(want)
    expect(repo.listByStory).toHaveBeenCalledWith('story-id-1')
  })

  it('lists an empty collection for a story', async () => {
    const { service, repo } = newServiceUnderTest()
    repo.listByStory.mockResolvedValue([])

    const got = await service.listByStory('story-id-1')

    expect(got).toEqual([])
    expect(repo.listByStory).toHaveBeenCalledWith('story-id-1')
  })

  it('lists all articles', async () => {
    const { service, repo } = newServiceUnderTest()
    const want: Article[] = [
      { ...emptyArticle, id: 'id-1', storyID: 'story-id-1', title: 'a' },
      { ...emptyArticle, id: 'id-2', storyID: 'story-id-2', title: 'b' }
    ]
    repo.list.mockResolvedValue(want)

    const got = await service.list()

    expect(got).toEqual(want)
    expect(repo.list).toHaveBeenCalledTimes(1)
  })

  it('lists an empty collection', async () => {
    const { service, repo } = newServiceUnderTest()
    repo.list.mockResolvedValue([])

    const got = await service.list()

    expect(got).toEqual([])
    expect(repo.list).toHaveBeenCalledTimes(1)
  })

  it('updates an article', async () => {
    const { service, repo } = newServiceUnderTest()
    const stored: Article = {
      ...emptyArticle,
      id: 'id-1',
      storyID: 'story-id-1',
      title: 'Old title',
      subtitle: 'Old subtitle',
      target: 'Old target',
      text: 'Old text'
    }
    repo.get.mockResolvedValue(stored)
    const input: Article = {
      ...stored,
      title: 'Title',
      subtitle: 'Subtitle',
      target: 'Target',
      text: 'Text'
    }
    repo.update.mockResolvedValue(input)

    const updated = await service.update(input)

    expect(updated).toEqual(input)
    expect(repo.get).toHaveBeenCalledWith('id-1')
    expect(repo.update).toHaveBeenCalledWith(input)
  })

  it('stores trimmed values on update', async () => {
    const { service, repo } = newServiceUnderTest()
    const stored: Article = { ...emptyArticle, id: 'id-1', storyID: 'story-id-1', title: 'Old' }
    repo.get.mockResolvedValue(stored)
    repo.update.mockImplementation(async (article) => {
      expect(article.title).toBe('Title')
      expect(article.subtitle).toBe('Subtitle')
      expect(article.target).toBe('Target')
      expect(article.text).toBe('Text')
      return stored
    })

    await service.update({
      ...emptyArticle,
      id: 'id-1',
      storyID: 'story-id-1',
      title: '  Title  ',
      subtitle: '  Subtitle  ',
      target: '  Target  ',
      text: '  Text  '
    })

    expect(repo.update).toHaveBeenCalledTimes(1)
  })

  it('propagates not found on update without updating', async () => {
    const { service, repo } = newServiceUnderTest()
    const input: Article = {
      ...emptyArticle,
      id: 'missing',
      storyID: 'story-id-1',
      title: 'Title',
      subtitle: 'Subtitle',
      target: 'Target',
      text: 'Text'
    }
    repo.get.mockRejectedValue(errNotFound)

    await expect(service.update(input)).rejects.toBe(errNotFound)

    expect(repo.update).not.toHaveBeenCalled()
    expect(repo.get).toHaveBeenCalledWith('missing')
  })

  it('rejects a story change as immutable', async () => {
    const { service, repo } = newServiceUnderTest()
    const stored: Article = {
      ...emptyArticle,
      id: 'id-1',
      storyID: 'story-id-1',
      title: 'Title',
      subtitle: 'Subtitle',
      target: 'Target',
      text: 'Text'
    }
    repo.get.mockResolvedValue(stored)
    const input: Article = { ...stored, storyID: 'story-id-2', title: 'New title' }

    await expect(service.update(input)).rejects.toBe(errStoryIDImmutable)

    expect(repo.update).not.toHaveBeenCalled()
    expect(repo.get).toHaveBeenCalledWith('id-1')
  })

  it('rejects an invalid article on update without touching the repository', async () => {
    const { service, repo } = newServiceUnderTest()

    // Go subcases: story id required, title required and title too long.
    await expect(
      service.update({
        ...emptyArticle,
        id: 'id-1',
        title: 'Title',
        subtitle: 'Subtitle',
        target: 'Target',
        text: 'Text'
      })
    ).rejects.toBe(errStoryIDRequired)
    await expect(
      service.update({
        ...emptyArticle,
        id: 'id-1',
        storyID: 'story-id-1',
        subtitle: 'Subtitle',
        target: 'Target',
        text: 'Text'
      })
    ).rejects.toBe(errTitleRequired)
    await expect(
      service.update({
        ...emptyArticle,
        id: 'id-1',
        storyID: 'story-id-1',
        title: 'a'.repeat(256),
        subtitle: 'Subtitle',
        target: 'Target',
        text: 'Text'
      })
    ).rejects.toBe(errTitleTooLong)

    expect(repo.get).not.toHaveBeenCalled()
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('deletes an article', async () => {
    const { service, repo } = newServiceUnderTest()
    repo.delete.mockResolvedValue(undefined)

    await service.delete('id-1')

    expect(repo.delete).toHaveBeenCalledWith('id-1')
  })

  it('propagates not found on delete', async () => {
    const { service, repo } = newServiceUnderTest()
    repo.delete.mockRejectedValue(errNotFound)

    await expect(service.delete('missing')).rejects.toBe(errNotFound)

    expect(repo.delete).toHaveBeenCalledWith('missing')
  })
})
