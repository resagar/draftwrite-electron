import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from '@jest/globals'
import { registerIpcHandlers } from './adapters/ipc/register'
import { storyChannels } from './adapters/ipc/contract'
import type { Article } from './article/model'
import {
  errNotFound as articleErrNotFound,
  errTitleTaken as articleErrTitleTaken
} from './article/repository'
import { errStoryNotFound } from './article/service'
import { bootstrap, closeDatabase, type Bootstrap } from './bootstrap'
import { APP_DIR_NAME, DB_FILE_NAME } from './platform/data-dir'
import type { Story } from './story/model'
import { errTopicTaken } from './story/repository'

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

interface Fixture {
  boot: Bootstrap
  tmp: string
}

const fixtures: Fixture[] = []

/** Boots a real application on a throwaway directory, isolated from the HOME. */
function newFixture(): Fixture {
  const tmp = mkdtempSync(join(tmpdir(), 'draftwrite-'))
  const boot = bootstrap({ platform: 'linux', env: { XDG_DATA_HOME: tmp } })
  const fixture = { boot, tmp }
  fixtures.push(fixture)
  return fixture
}

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

async function invoke(ipcMain: FakeIpcMain, channel: string, ...args: unknown[]): Promise<unknown> {
  const handler = ipcMain.handlers.get(channel)
  if (handler === undefined) {
    throw new Error(`no handler registered for ${channel}`)
  }
  return handler({}, ...args)
}

describe('bootstrap', () => {
  afterEach(() => {
    let fixture = fixtures.pop()
    while (fixture !== undefined) {
      closeDatabase(fixture.boot.db)
      rmSync(fixture.tmp, { recursive: true, force: true })
      fixture = fixtures.pop()
    }
  })

  it('creates the data directory with owner-only permissions', () => {
    const { tmp } = newFixture()

    const dataDir = join(tmp, APP_DIR_NAME)
    const stats = statSync(dataDir)

    expect(stats.isDirectory()).toBe(true)
    expect(stats.mode & 0o077).toBe(0)
    expect(existsSync(join(dataDir, DB_FILE_NAME))).toBe(true)
  })

  it('runs a story and its article through the full lifecycle', async () => {
    const { boot } = newFixture()
    const { services } = boot

    const story = await services.story.create({ ...emptyStory, topic: 'space opera' })
    const article = await services.article.create({
      ...emptyArticle,
      storyID: story.id,
      title: 'Pilot'
    })

    const listed = await services.article.listByStory(story.id)
    expect(listed).toHaveLength(1)
    expect(listed[0]?.id).toBe(article.id)

    const updated = await services.article.update({
      ...article,
      title: '  Pilot revised  ',
      subtitle: '  revised subtitle  ',
      target: '  a target  ',
      text: '  trimmed text  '
    })
    expect(updated.title).toBe('Pilot revised')
    expect(updated.subtitle).toBe('revised subtitle')
    expect(updated.target).toBe('a target')
    expect(updated.text).toBe('trimmed text')

    const fetched = await services.article.get(article.id)
    expect(fetched.subtitle).toBe('revised subtitle')

    await services.article.delete(article.id)
    await expect(services.article.listByStory(story.id)).resolves.toEqual([])
  })

  it('rejects creating an article for a missing story', async () => {
    const { boot } = newFixture()

    await expect(
      boot.services.article.create({ ...emptyArticle, storyID: 'missing-story', title: 'Orphan' })
    ).rejects.toBe(errStoryNotFound)
  })

  it('deletes the articles of a story in cascade', async () => {
    const { boot } = newFixture()
    const story = await boot.services.story.create({ ...emptyStory, topic: 'space opera' })
    const article = await boot.services.article.create({
      ...emptyArticle,
      storyID: story.id,
      title: 'Pilot'
    })

    await boot.services.story.delete(story.id)

    await expect(boot.services.article.get(article.id)).rejects.toBe(articleErrNotFound)
  })

  it('rejects duplicate topics and duplicate titles within a story', async () => {
    const { boot } = newFixture()
    const story = await boot.services.story.create({ ...emptyStory, topic: 'space opera' })

    await expect(boot.services.story.create({ ...emptyStory, topic: 'space opera' })).rejects.toBe(
      errTopicTaken
    )

    await boot.services.article.create({ ...emptyArticle, storyID: story.id, title: 'Pilot' })
    await expect(
      boot.services.article.create({ ...emptyArticle, storyID: story.id, title: 'Pilot' })
    ).rejects.toBe(articleErrTitleTaken)
  })

  it('exposes the real services through the ipc envelope', async () => {
    const { boot } = newFixture()
    const ipcMain = newFakeIpcMain()
    registerIpcHandlers(ipcMain, boot.services)

    const created = await invoke(ipcMain, storyChannels.create, {
      topic: 'space opera',
      titles: [],
      tags: [],
      text: ''
    })

    expect(created).toEqual({
      ok: true,
      value: {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        topic: 'space opera',
        titles: [],
        tags: [],
        text: '',
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      }
    })

    const missing = await invoke(ipcMain, storyChannels.get, 'missing-story')

    expect(missing).toEqual({
      ok: false,
      error: { code: 'errNotFound', message: 'story not found' }
    })
  })
})
