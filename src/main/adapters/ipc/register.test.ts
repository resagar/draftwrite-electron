import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { newFakeArticleRepository, type FakeArticleRepository } from '../../article/fake'
import { errNotFound } from '../../article/repository'
import { newArticleService } from '../../article/service'
import { newFakePostRepository, type FakePostRepository } from '../../post/fake'
import { errTopicRequired } from '../../post/model'
import { newPostService } from '../../post/service'
import { newFakeStoryRepository, type FakeStoryRepository } from '../../story/fake'
import { newStoryService } from '../../story/service'
import { articleChannels, postChannels, storyChannels } from './contract'
import { registerIpcHandlers } from './register'

type Handler = (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown

interface FakeIpcMain {
  handlers: Map<string, Handler>
  handle(channel: string, listener: Handler): void
}

function newFakeIpcMain(): FakeIpcMain {
  const handlers = new Map<string, Handler>()
  return {
    handlers,
    handle(channel, listener) {
      handlers.set(channel, listener)
    }
  }
}

interface Harness {
  ipcMain: FakeIpcMain
  storyRepo: FakeStoryRepository
  articleRepo: FakeArticleRepository
  postRepo: FakePostRepository
}

function newHarness(): Harness {
  const ipcMain = newFakeIpcMain()
  const storyRepo = newFakeStoryRepository()
  const articleRepo = newFakeArticleRepository()
  const postRepo = newFakePostRepository()
  registerIpcHandlers(ipcMain, {
    story: newStoryService(storyRepo),
    article: newArticleService(articleRepo, storyRepo),
    post: newPostService(postRepo, storyRepo, articleRepo)
  })
  return { ipcMain, storyRepo, articleRepo, postRepo }
}

async function invoke(ipcMain: FakeIpcMain, channel: string, ...args: unknown[]): Promise<unknown> {
  const handler = ipcMain.handlers.get(channel)
  if (handler === undefined) {
    throw new Error(`no handler registered for ${channel}`)
  }
  return handler({}, ...args)
}

describe('registerIpcHandlers', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('registers exactly the fifteen channels of the contract', () => {
    const { ipcMain } = newHarness()
    const expected = [
      ...Object.values(storyChannels),
      ...Object.values(articleChannels),
      ...Object.values(postChannels)
    ].sort()

    expect(ipcMain.handlers.size).toBe(15)
    expect([...ipcMain.handlers.keys()].sort()).toEqual(expected)
  })

  it('answers story:create with the result envelope', async () => {
    const { ipcMain, storyRepo } = newHarness()
    storyRepo.create.mockImplementation(async (story) => story)

    const result = await invoke(ipcMain, storyChannels.create, {
      topic: 'space opera',
      titles: ['First draft'],
      tags: ['novel'],
      text: 'A story about space.',
      junk: 'ignored'
    })

    expect(result).toEqual({
      ok: true,
      value: {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        topic: 'space opera',
        titles: ['First draft'],
        tags: ['novel'],
        text: 'A story about space.',
        createdAt: '',
        updatedAt: ''
      }
    })
    expect(storyRepo.create).toHaveBeenCalledTimes(1)
  })

  it('answers domain errors with their code and message', async () => {
    const { ipcMain } = newHarness()

    const result = await invoke(ipcMain, storyChannels.create, {
      topic: '   ',
      titles: [],
      tags: [],
      text: ''
    })

    expect(result).toEqual({
      ok: false,
      error: { code: 'errTopicRequired', message: 'story topic is required' }
    })
  })

  it('maps unexpected errors to errUnexpected and logs them', async () => {
    const { ipcMain, storyRepo } = newHarness()
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {})
    storyRepo.list.mockRejectedValue(new Error('boom'))

    const result = await invoke(ipcMain, storyChannels.list)

    expect(result).toEqual({ ok: false, error: { code: 'errUnexpected', message: 'boom' } })
    expect(logged).toHaveBeenCalled()
  })

  it('rejects invalid payloads with errUnexpected', async () => {
    const { ipcMain, storyRepo } = newHarness()
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await invoke(ipcMain, storyChannels.create, {
      topic: 42,
      titles: [],
      tags: [],
      text: ''
    })

    expect(result).toEqual({
      ok: false,
      error: { code: 'errUnexpected', message: 'invalid payload: topic must be a string' }
    })
    expect(storyRepo.create).not.toHaveBeenCalled()
  })

  it('propagates not found errors over the article channels', async () => {
    const { ipcMain, articleRepo } = newHarness()
    articleRepo.get.mockRejectedValue(errNotFound)

    const result = await invoke(ipcMain, articleChannels.get, 'no-such-id')

    expect(result).toEqual({
      ok: false,
      error: { code: 'errNotFound', message: 'article not found' }
    })
    expect(articleRepo.get).toHaveBeenCalledWith('no-such-id')
  })

  it('answers post:create with a pending post', async () => {
    const { ipcMain, postRepo } = newHarness()
    postRepo.create.mockImplementation(async (post) => post)

    const result = await invoke(ipcMain, postChannels.create, {
      topic: 'Launch note',
      text: 'Short body',
      state: 'published',
      storyID: null,
      articleID: null,
      junk: 'ignored'
    })

    expect(result).toEqual({
      ok: true,
      value: {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        topic: 'Launch note',
        text: 'Short body',
        state: 'pending',
        scheduledAt: null,
        storyID: null,
        articleID: null,
        createdAt: '',
        updatedAt: ''
      }
    })
    expect(postRepo.create).toHaveBeenCalledTimes(1)
  })

  it('answers post domain errors with their code and message', async () => {
    const { ipcMain, postRepo } = newHarness()

    const result = await invoke(ipcMain, postChannels.create, {
      topic: '   ',
      text: '',
      storyID: null,
      articleID: null
    })

    expect(result).toEqual({
      ok: false,
      error: { code: errTopicRequired.code, message: errTopicRequired.message }
    })
    expect(postRepo.create).not.toHaveBeenCalled()
  })

  it('rejects an invalid post state on update', async () => {
    const { ipcMain, postRepo } = newHarness()
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await invoke(ipcMain, postChannels.update, {
      id: 'post-1',
      topic: 'Launch',
      text: '',
      state: 'archived',
      scheduledAt: null,
      storyID: null,
      articleID: null
    })

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'errUnexpected',
        message: 'invalid payload: state must be one of pending, scheduled, published'
      }
    })
    expect(postRepo.update).not.toHaveBeenCalled()
  })

  it('accepts a scheduled date on update and keeps null as absence', async () => {
    const { ipcMain, postRepo } = newHarness()
    postRepo.get.mockResolvedValue({
      id: 'post-1',
      topic: 'Launch',
      text: '',
      state: 'pending',
      scheduledAt: null,
      storyID: null,
      articleID: null,
      createdAt: '',
      updatedAt: ''
    })
    postRepo.update.mockImplementation(async (post) => post)

    const scheduled = await invoke(ipcMain, postChannels.update, {
      id: 'post-1',
      topic: 'Launch',
      text: '',
      state: 'scheduled',
      scheduledAt: '2026-11-01T10:00',
      storyID: null,
      articleID: null
    })

    expect(scheduled).toMatchObject({
      ok: true,
      value: { state: 'scheduled', scheduledAt: '2026-11-01T10:00' }
    })

    const pending = await invoke(ipcMain, postChannels.update, {
      id: 'post-1',
      topic: 'Launch',
      text: '',
      state: 'pending',
      scheduledAt: null,
      storyID: null,
      articleID: null
    })

    expect(pending).toMatchObject({ ok: true, value: { state: 'pending', scheduledAt: null } })
  })

  it('rejects a scheduled date that is not a string or null', async () => {
    const { ipcMain, postRepo } = newHarness()
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await invoke(ipcMain, postChannels.update, {
      id: 'post-1',
      topic: 'Launch',
      text: '',
      state: 'scheduled',
      scheduledAt: 42,
      storyID: null,
      articleID: null
    })

    expect(result).toEqual({
      ok: false,
      error: { code: 'errUnexpected', message: 'invalid payload: scheduledAt must be a string' }
    })
    expect(postRepo.update).not.toHaveBeenCalled()
  })

  it('answers post:create with the chosen source', async () => {
    const { ipcMain, postRepo, storyRepo } = newHarness()
    storyRepo.get.mockResolvedValue({
      id: 's1',
      topic: 'Calm software',
      titles: [],
      tags: [],
      text: '',
      createdAt: '',
      updatedAt: ''
    })
    postRepo.create.mockImplementation(async (post) => post)

    const result = await invoke(ipcMain, postChannels.create, {
      topic: 'Launch',
      text: '',
      storyID: 's1',
      articleID: null
    })

    expect(result).toMatchObject({
      ok: true,
      value: { storyID: 's1', articleID: null }
    })
    expect(storyRepo.get).toHaveBeenCalledWith('s1')
  })

  it('rejects a post that points at a story and an article', async () => {
    const { ipcMain, postRepo } = newHarness()
    postRepo.create.mockImplementation(async (post) => post)

    const result = await invoke(ipcMain, postChannels.create, {
      topic: 'Launch',
      text: '',
      storyID: 's1',
      articleID: 'a1'
    })

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'errSourceAmbiguous',
        message: 'post source must be a story or an article, not both'
      }
    })
    expect(postRepo.create).not.toHaveBeenCalled()
  })

  it('rejects a source that is not a string or null', async () => {
    const { ipcMain, postRepo } = newHarness()
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await invoke(ipcMain, postChannels.update, {
      id: 'post-1',
      topic: 'Launch',
      text: '',
      state: 'pending',
      scheduledAt: null,
      storyID: 42,
      articleID: null
    })

    expect(result).toEqual({
      ok: false,
      error: { code: 'errUnexpected', message: 'invalid payload: storyID must be a string' }
    })
    expect(postRepo.update).not.toHaveBeenCalled()
  })
})
