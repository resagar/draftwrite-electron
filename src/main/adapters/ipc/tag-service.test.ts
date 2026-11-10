import { afterEach, expect, it, jest } from '@jest/globals'
import { closeDatabase } from '../../bootstrap'
import { openDatabase, type AppDatabase } from '../../db'
import { newTagService } from '../../tag/service'
import { newTagRepository } from '../persistence/sqlite/tag-repository'
import { parseArticleCreatePayload, parsePostCreatePayload } from './validate'
import { registerTagHandlers } from './tag-service'
import type { IpcHandlerRegistry } from './contract'

let db: AppDatabase | undefined
afterEach(() => {
  if (db) closeDatabase(db)
  jest.restoreAllMocks()
})

it('validates tag IPC inputs before touching persistence and returns result envelopes', async () => {
  db = openDatabase(':memory:')
  const listeners = new Map<string, (event: unknown, ...args: unknown[]) => unknown>()
  const registry: IpcHandlerRegistry = {
    handle: (channel, listener) => {
      listeners.set(channel, listener)
    }
  }
  registerTagHandlers(registry, newTagService(newTagRepository(db)))
  const invoke = (channel: string, ...args: unknown[]): unknown =>
    listeners.get(channel)!({}, ...args)
  jest.spyOn(console, 'error').mockImplementation(() => {})
  expect(await invoke('tag:setColor', 'exact', 'teal')).toEqual({ ok: true, value: undefined })
  expect(await invoke('tag:list')).toEqual({ ok: true, value: [{ name: 'exact', color: 'teal' }] })
  expect(await invoke('tag:setColor', 'exact', 'url(script)')).toMatchObject({ ok: false })
  expect(await invoke('tag:deleteEverywhere', { name: 'exact' })).toMatchObject({ ok: false })
  expect(await invoke('tag:deleteEverywhere', ' ')).toMatchObject({
    ok: false,
    error: { code: 'errTagNameInvalid' }
  })
  expect(await invoke('tag:list')).toEqual({ ok: true, value: [{ name: 'exact', color: 'teal' }] })
})

it('rejects malformed Article/Post tag arrays and defaults missing input to empty arrays', () => {
  const article = { storyID: 's', title: 'Article', subtitle: '', target: '', text: '' }
  const post = { topic: 'Post', text: '', storyID: null, articleID: null }
  expect(parseArticleCreatePayload(article).tags).toEqual([])
  expect(parsePostCreatePayload(post).tags).toEqual([])
  expect(() => parseArticleCreatePayload({ ...article, tags: [42] })).toThrow()
  expect(() => parsePostCreatePayload({ ...post, tags: 'not a list' })).toThrow()
})
