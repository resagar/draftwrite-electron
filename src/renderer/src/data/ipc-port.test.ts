import { describe, expect, it, jest } from '@jest/globals'
import type {
  ArticleDTO,
  DraftwriteApi,
  PostDTO,
  StoryDTO
} from '../../../main/adapters/ipc/contract'
import { createIpcPort, IpcError } from './ipc-port'
import { defaultPreferences } from '../../../shared/typography'

const storyDTO: StoryDTO = {
  id: 's1',
  topic: 'Calm software',
  titles: ['Calm'],
  tags: ['essays'],
  text: 'Raw thoughts.',
  createdAt: '2024-10-14T10:00:00',
  updatedAt: '2024-10-14T10:00:00'
}

const articleDTO: ArticleDTO = {
  id: 'a1',
  storyID: 's1',
  title: 'The architecture of calm',
  subtitle: 'On calm tools',
  target: 'Convince the reader',
  text: 'The text of the article',
  createdAt: '2024-10-14T10:00:00',
  updatedAt: '2024-10-14T10:00:00'
}

const postDTO: PostDTO = {
  id: 'p1',
  topic: 'Launch note',
  text: 'Short body',
  state: 'pending',
  scheduledAt: null,
  storyID: null,
  articleID: null,
  createdAt: '2024-10-14T10:00:00',
  updatedAt: '2024-10-14T10:00:00'
}

interface ApiOverrides {
  story?: Partial<DraftwriteApi['story']>
  article?: Partial<DraftwriteApi['article']>
  post?: Partial<DraftwriteApi['post']>
}

function createFakeApi(overrides: ApiOverrides = {}): DraftwriteApi {
  const story: DraftwriteApi['story'] = {
    create: async (input) => ({ ok: true, value: input }),
    get: async () => ({ ok: false, error: { code: 'errNotFound', message: 'story not found' } }),
    list: async () => ({ ok: true, value: [] }),
    update: async (input) => ({ ok: true, value: input }),
    delete: async () => ({ ok: true, value: undefined })
  }
  const article: DraftwriteApi['article'] = {
    create: async (input) => ({ ok: true, value: input }),
    get: async () => ({ ok: false, error: { code: 'errNotFound', message: 'article not found' } }),
    listByStory: async () => ({ ok: true, value: [] }),
    list: async () => ({ ok: true, value: [] }),
    update: async (input) => ({ ok: true, value: input }),
    delete: async () => ({ ok: true, value: undefined })
  }
  const post: DraftwriteApi['post'] = {
    create: async (input) => ({ ok: true, value: input }),
    get: async () => ({ ok: false, error: { code: 'errNotFound', message: 'post not found' } }),
    list: async () => ({ ok: true, value: [] }),
    update: async (input) => ({ ok: true, value: input }),
    delete: async () => ({ ok: true, value: undefined })
  }

  return {
    settings: {
      open: async () => ({ ok: true, value: undefined }),
      close: async () => ({ ok: true, value: undefined }),
      get: async () => ({
        ok: true,
        value: { preferences: defaultPreferences, revision: 0, storageError: false }
      }),
      patch: async () => ({
        ok: true,
        value: { preferences: defaultPreferences, revision: 1, storageError: false }
      }),
      storage: async () => ({ ok: true, value: undefined }),
      onChanged: () => () => {}
    },
    story: { ...story, ...overrides.story },
    article: { ...article, ...overrides.article },
    post: { ...post, ...overrides.post }
  }
}

describe('createIpcPort', () => {
  it('lists system font families at the browser boundary and propagates access failures', async () => {
    const browser = window as Window & { queryLocalFonts?: () => Promise<{ family: string }[]> }
    const previous = browser.queryLocalFonts
    try {
      browser.queryLocalFonts = async () => [{ family: 'Local Serif' }, { family: 'Local Mono' }]
      const port = createIpcPort(createFakeApi())
      await expect(port.listFontFamilies()).resolves.toEqual(['Local Serif', 'Local Mono'])
      browser.queryLocalFonts = async () => {
        throw new Error('Font access denied')
      }
      await expect(port.listFontFamilies()).rejects.toThrow('Font access denied')
      delete browser.queryLocalFonts
      await expect(port.listFontFamilies()).rejects.toThrow('Local font access is unavailable')
    } finally {
      if (previous) browser.queryLocalFonts = previous
      else delete browser.queryLocalFonts
    }
  })

  it('maps the stories the api lists to the interface shape', async () => {
    const api = createFakeApi({ story: { list: async () => ({ ok: true, value: [storyDTO] }) } })
    const port = createIpcPort(api)

    await expect(port.listStories()).resolves.toEqual([
      {
        ID: 's1',
        Topic: 'Calm software',
        Titles: ['Calm'],
        Tags: ['essays'],
        Text: 'Raw thoughts.',
        CreatedAt: '2024-10-14T10:00:00',
        UpdatedAt: '2024-10-14T10:00:00'
      }
    ])
  })

  it('maps the articles the api lists to the interface shape', async () => {
    const api = createFakeApi({
      article: { list: async () => ({ ok: true, value: [articleDTO] }) }
    })
    const port = createIpcPort(api)

    await expect(port.listArticles()).resolves.toEqual([
      {
        ID: 'a1',
        StoryID: 's1',
        Title: 'The architecture of calm',
        Subtitle: 'On calm tools',
        Target: 'Convince the reader',
        Text: 'The text of the article',
        CreatedAt: '2024-10-14T10:00:00',
        UpdatedAt: '2024-10-14T10:00:00'
      }
    ])
  })

  it('rejects with the code and the message of a failed envelope', async () => {
    const api = createFakeApi({
      story: {
        list: async () => ({
          ok: false,
          error: { code: 'errNotFound', message: 'story not found' }
        })
      }
    })
    const port = createIpcPort(api)

    await expect(port.listStories()).rejects.toBeInstanceOf(IpcError)
    await expect(port.listStories()).rejects.toMatchObject({
      name: 'IpcError',
      code: 'errNotFound',
      message: 'story not found'
    })
  })

  it('sends created stories in camelCase with backend-owned placeholders', async () => {
    const api = createFakeApi()
    const create = jest.spyOn(api.story, 'create')
    const port = createIpcPort(api)

    const created = await port.createStory({
      topic: 'Calm software',
      titles: ['Calm'],
      tags: ['essays'],
      text: ''
    })

    expect(create).toHaveBeenCalledTimes(1)
    const [dto] = create.mock.calls[0]

    expect(dto).toMatchObject({
      topic: 'Calm software',
      titles: ['Calm'],
      tags: ['essays'],
      text: ''
    })
    expect(dto.id).toBe('')
    expect(dto.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(dto.updatedAt).toBe(dto.createdAt)
    expect(created.ID).toBe('')
    expect(created.Topic).toBe('Calm software')
  })

  it('sends created articles in camelCase with backend-owned placeholders', async () => {
    const api = createFakeApi()
    const create = jest.spyOn(api.article, 'create')
    const port = createIpcPort(api)

    const created = await port.createArticle({
      storyId: 's1',
      title: 'The architecture of calm',
      subtitle: '',
      target: '',
      text: ''
    })

    expect(create).toHaveBeenCalledTimes(1)
    const [dto] = create.mock.calls[0]

    expect(dto).toMatchObject({
      storyID: 's1',
      title: 'The architecture of calm',
      subtitle: '',
      target: '',
      text: ''
    })
    expect(dto.id).toBe('')
    expect(dto.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(created.StoryID).toBe('s1')
  })

  it('maps an updated story back to the interface shape', async () => {
    const api = createFakeApi()
    const update = jest.spyOn(api.story, 'update')
    const port = createIpcPort(api)

    const updated = await port.updateStory({
      ID: 's1',
      Topic: 'Calm software',
      Titles: [],
      Tags: [],
      Text: 'New body',
      CreatedAt: '2024-10-14T10:00:00',
      UpdatedAt: '2024-10-15T10:00:00'
    })

    expect(update).toHaveBeenCalledTimes(1)
    const [dto] = update.mock.calls[0]

    expect(dto).toEqual({
      id: 's1',
      topic: 'Calm software',
      titles: [],
      tags: [],
      text: 'New body',
      createdAt: '2024-10-14T10:00:00',
      updatedAt: '2024-10-15T10:00:00'
    })
    expect(updated.Text).toBe('New body')
  })

  it('maps the posts the api lists to the interface shape', async () => {
    const api = createFakeApi({ post: { list: async () => ({ ok: true, value: [postDTO] }) } })
    const port = createIpcPort(api)

    await expect(port.listPosts()).resolves.toEqual([
      {
        ID: 'p1',
        Topic: 'Launch note',
        Text: 'Short body',
        State: 'pending',
        ScheduledAt: null,
        StoryID: null,
        ArticleID: null,
        CreatedAt: '2024-10-14T10:00:00',
        UpdatedAt: '2024-10-14T10:00:00'
      }
    ])
  })

  it('sends created posts in camelCase and always pending', async () => {
    const api = createFakeApi()
    const create = jest.spyOn(api.post, 'create')
    const port = createIpcPort(api)

    const created = await port.createPost({
      topic: 'Launch note',
      text: 'Short body',
      storyId: null,
      articleId: null
    })

    expect(create).toHaveBeenCalledTimes(1)
    const [dto] = create.mock.calls[0]

    expect(dto).toMatchObject({
      topic: 'Launch note',
      text: 'Short body',
      state: 'pending',
      scheduledAt: null,
      storyID: null,
      articleID: null
    })
    expect(dto.id).toBe('')
    expect(dto.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(created.Topic).toBe('Launch note')
    expect(created.State).toBe('pending')
  })

  it('maps an updated post back to the interface shape', async () => {
    const api = createFakeApi()
    const update = jest.spyOn(api.post, 'update')
    const port = createIpcPort(api)

    const updated = await port.updatePost({
      ID: 'p1',
      Topic: 'Launch note',
      Text: 'New body',
      State: 'pending',
      ScheduledAt: null,
      StoryID: null,
      ArticleID: null,
      CreatedAt: '2024-10-14T10:00:00',
      UpdatedAt: '2024-10-15T10:00:00'
    })

    const [dto] = update.mock.calls[0]

    expect(dto).toEqual({
      id: 'p1',
      topic: 'Launch note',
      text: 'New body',
      state: 'pending',
      scheduledAt: null,
      storyID: null,
      articleID: null,
      createdAt: '2024-10-14T10:00:00',
      updatedAt: '2024-10-15T10:00:00'
    })
    expect(updated.Text).toBe('New body')
  })

  it('unwraps deletes and propagates their failures', async () => {
    const api = createFakeApi({
      article: {
        delete: async () => ({
          ok: false,
          error: { code: 'errNotFound', message: 'article not found' }
        })
      }
    })
    const port = createIpcPort(api)

    await expect(port.deleteArticle('missing')).rejects.toMatchObject({
      code: 'errNotFound',
      message: 'article not found'
    })
  })
})
