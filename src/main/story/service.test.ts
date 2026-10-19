import { describe, expect, it } from '@jest/globals'
import { newFakeStoryRepository, type FakeStoryRepository } from './fake'
import { errTopicRequired, type Story } from './model'
import { errNotFound, errTopicTaken } from './repository'
import { newStoryService, type StoryService } from './service'

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
  service: StoryService
  repo: FakeStoryRepository
}

function newServiceUnderTest(): ServiceUnderTest {
  const repo = newFakeStoryRepository()
  return { service: newStoryService(repo), repo }
}

describe('storyService', () => {
  it('creates a story from the input values', async () => {
    const { service, repo } = newServiceUnderTest()
    const topic = 'space opera'
    const titles = ['First draft', 'Final draft']
    const tags = ['novel', 'scifi']
    const text = 'A story about space.'
    repo.create.mockImplementation(async (story) => {
      expect(story.id).not.toBe('')
      expect(story.topic).toBe(topic)
      expect(story.text).toBe(text)
      expect(story.titles).toEqual(titles)
      expect(story.tags).toEqual(tags)
      return { ...emptyStory, id: 'generated-uuid', topic, titles, tags, text }
    })

    const created = await service.create({ ...emptyStory, topic, titles, tags, text })

    expect(created.id).not.toBe('')
    expect(created.topic).toBe(topic)
    expect(created.titles).toEqual(titles)
    expect(created.tags).toEqual(tags)
    expect(created.text).toBe(text)
    expect(repo.create).toHaveBeenCalledTimes(1)
  })

  it('creates a story with only the topic', async () => {
    const { service, repo } = newServiceUnderTest()
    repo.create.mockImplementation(async (story) => {
      expect(story.id).not.toBe('')
      expect(story.topic).toBe('topic')
      expect(story.text).toBe('')
      expect(story.titles).toHaveLength(0)
      expect(story.tags).toHaveLength(0)
      return { ...emptyStory, id: 'generated-uuid', topic: 'topic' }
    })

    const created = await service.create({ ...emptyStory, topic: 'topic' })

    expect(created.id).not.toBe('')
    expect(created.topic).toBe('topic')
    expect(repo.create).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid input without calling the repository', async () => {
    const { service, repo } = newServiceUnderTest()

    // Go subcases: "topic required" and "topic blank".
    await expect(service.create({ ...emptyStory, topic: '' })).rejects.toBe(errTopicRequired)
    await expect(service.create({ ...emptyStory, topic: '   ' })).rejects.toBe(errTopicRequired)

    expect(repo.create).not.toHaveBeenCalled()
  })

  it('surfaces the error when the topic is taken', async () => {
    const { service, repo } = newServiceUnderTest()
    repo.create.mockImplementation(async (story) => {
      expect(story.id).not.toBe('')
      throw errTopicTaken
    })

    await expect(
      service.create({ ...emptyStory, topic: 'duplicated', titles: ['title'], text: 'text' })
    ).rejects.toBe(errTopicTaken)

    expect(repo.create).toHaveBeenCalledTimes(1)
  })

  it('gets a story by id', async () => {
    const { service, repo } = newServiceUnderTest()
    const want: Story = {
      ...emptyStory,
      id: 'id-1',
      topic: 'topic',
      titles: ['title'],
      tags: ['tag'],
      text: 'text'
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

  it('lists stories', async () => {
    const { service, repo } = newServiceUnderTest()
    const want: Story[] = [
      { ...emptyStory, id: 'id-1', topic: 'a' },
      { ...emptyStory, id: 'id-2', topic: 'b' }
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

  it('updates a story', async () => {
    const { service, repo } = newServiceUnderTest()
    const input: Story = {
      ...emptyStory,
      id: 'id-1',
      topic: 'topic',
      titles: ['title'],
      tags: ['tag'],
      text: 'text'
    }
    repo.update.mockResolvedValue(input)

    const updated = await service.update(input)

    expect(updated).toEqual(input)
    expect(repo.update).toHaveBeenCalledWith(input)
  })

  it('stores trimmed values on update', async () => {
    const { service, repo } = newServiceUnderTest()
    repo.update.mockImplementation(async (story) => {
      expect(story.id).toBe('id-1')
      expect(story.topic).toBe('topic')
      expect(story.text).toBe('text')
      return { ...emptyStory, id: 'id-1', topic: 'topic', text: 'text' }
    })

    const updated = await service.update({
      ...emptyStory,
      id: 'id-1',
      topic: '  topic  ',
      text: '  text  '
    })

    expect(updated.topic).toBe('topic')
    expect(repo.update).toHaveBeenCalledTimes(1)
  })

  it('propagates not found on update without reading first', async () => {
    const { service, repo } = newServiceUnderTest()
    const input: Story = {
      ...emptyStory,
      id: 'missing',
      topic: 'topic',
      titles: ['title'],
      text: 'text'
    }
    repo.update.mockImplementation(async (story) => {
      expect(story).toEqual(input)
      throw errNotFound
    })

    await expect(service.update(input)).rejects.toBe(errNotFound)

    expect(repo.update).toHaveBeenCalledTimes(1)
  })

  it('rejects an invalid story on update without touching the repository', async () => {
    const { service, repo } = newServiceUnderTest()

    // Go subcases: "topic required" and "topic blank".
    await expect(
      service.update({ ...emptyStory, id: 'id-1', titles: ['title'], text: 'text' })
    ).rejects.toBe(errTopicRequired)
    await expect(service.update({ ...emptyStory, id: 'id-1', topic: '   ' })).rejects.toBe(
      errTopicRequired
    )

    expect(repo.update).not.toHaveBeenCalled()
  })

  it('deletes a story', async () => {
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
