import { EditorView } from '@codemirror/view'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, jest } from '@jest/globals'
import { makeArticle, makePost, makeStory } from './data/fake/factories'
import { createFakePort } from './data/fake/fake-port'
import { createDeferred } from './test/deferred'
import { renderApp } from './test/render-app'

describe('App shell', () => {
  it('renders the four zones of the shell', () => {
    renderApp(createFakePort().port)

    expect(screen.getByRole('banner')).toBeTruthy()
    expect(screen.getByRole('main')).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'Library' })).toBeTruthy()
    expect(screen.getByRole('contentinfo')).toBeTruthy()
  })

  it('labels the workspace pane', () => {
    renderApp(createFakePort().port)

    expect(screen.getByRole('region', { name: 'Workspace' })).toBeTruthy()
  })
})

describe('zen mode', () => {
  const zenButton = (): HTMLElement => screen.getByRole('button', { name: /Zen mode/ })

  it('hides the sidebar and the list while keeping the editor, and brings them back', async () => {
    const fake = createFakePort({
      stories: [makeStory({ ID: 's1', Topic: 'Calm software' })],
      articles: []
    })

    renderApp(fake.port)

    const list = await screen.findByRole('listbox', { name: 'Stories' })
    fireEvent.click(within(list).getByRole('option', { name: /Calm software/ }))
    const listRegion = screen.getByRole('region', { name: 'Stories' })

    fireEvent.click(zenButton())

    expect(zenButton().getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByRole('complementary', { name: 'Library' })).toBeNull()
    expect(screen.queryByRole('listbox', { name: 'Stories' })).toBeNull()
    expect(screen.getByRole('region', { name: 'Story editor' })).toBeTruthy()
    // The list keeps its content and animates its width to zero instead of unmounting.
    expect(listRegion.style.width).toBe('0px')
    expect(listRegion.getAttribute('aria-hidden')).toBe('true')

    fireEvent.click(zenButton())

    expect(zenButton().getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('complementary', { name: 'Library' })).toBeTruthy()
    expect(screen.getByRole('listbox', { name: 'Stories' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Story editor' })).toBeTruthy()
  })

  it('toggles from the keyboard with Ctrl/Cmd+Shift+D and ignores Ctrl+D', () => {
    renderApp(createFakePort().port)

    fireEvent.keyDown(window, { key: 'd', ctrlKey: true })
    expect(zenButton().getAttribute('aria-pressed')).toBe('false')

    fireEvent.keyDown(window, { key: 'D', ctrlKey: true, shiftKey: true })
    expect(zenButton().getAttribute('aria-pressed')).toBe('true')

    fireEvent.keyDown(window, { key: 'D', ctrlKey: true, shiftKey: true })
    expect(zenButton().getAttribute('aria-pressed')).toBe('false')
  })

  it('leaves the sidebar rail untouched', () => {
    renderApp(createFakePort().port)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }))

    fireEvent.click(zenButton())
    fireEvent.click(zenButton())

    expect(
      screen.getByRole('button', { name: 'Toggle sidebar' }).getAttribute('aria-pressed')
    ).toBe('true')
    expect(zenButton().getAttribute('aria-pressed')).toBe('false')
  })
})

describe('posts', () => {
  it('offers a third library that lists the stored posts', async () => {
    const fake = createFakePort({
      stories: [],
      posts: [makePost({ ID: 'p1', Topic: 'Launch note', Text: 'Short body' })]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Posts' }))

    const list = await screen.findByRole('listbox', { name: 'Posts' })

    expect(within(list).getByRole('option', { name: /Launch note/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Posts' }).getAttribute('aria-current')).toBe('page')
  })

  it('creates a post once it has a topic, and opens it', async () => {
    const fake = createFakePort({ stories: [], posts: [] })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Posts' }))
    await screen.findByText('No posts yet')

    fireEvent.click(screen.getByRole('button', { name: 'New Post' }))

    expect(await screen.findByRole('region', { name: 'Post editor' })).toBeTruthy()
    expect(fake.calls.createPost).toBe(0)

    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'Launch note' } })

    await waitFor(() => expect(fake.calls.createPost).toBe(1), { timeout: 3000 })

    expect(fake.createdPosts).toEqual([
      { topic: 'Launch note', text: '', storyId: null, articleId: null }
    ])
    expect(await screen.findByRole('option', { name: /Launch note/ })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Post' })).toBeTruthy()
  })

  it('writes nothing and says so while the topic is blank', async () => {
    const fake = createFakePort({ stories: [], posts: [] })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Posts' }))
    await screen.findByText('No posts yet')
    fireEvent.click(screen.getByRole('button', { name: 'New Post' }))

    expect(await screen.findByText(/A topic is required/)).toBeTruthy()
    expect(fake.calls.createPost).toBe(0)
  })

  it('reopens a stored post from the list', async () => {
    const fake = createFakePort({
      stories: [],
      posts: [makePost({ ID: 'p1', Topic: 'Launch note', Text: 'Short body' })]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Posts' }))
    const list = await screen.findByRole('listbox', { name: 'Posts' })

    fireEvent.click(within(list).getByRole('option', { name: /Launch note/ }))

    expect(await screen.findByRole('region', { name: 'Post' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Post editor' })).toBeTruthy()
  })
})

describe('post states', () => {
  it('changes the state and keeps a date only while scheduled', async () => {
    const fake = createFakePort({
      stories: [],
      posts: [makePost({ ID: 'p1', Topic: 'Launch note' })]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Posts' }))
    const list = await screen.findByRole('listbox', { name: 'Posts' })
    fireEvent.click(within(list).getByRole('option', { name: /Launch note/ }))
    await screen.findByRole('region', { name: 'Post' })

    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'scheduled' } })
    fireEvent.change(screen.getByLabelText('Scheduled at'), {
      target: { value: '2026-11-01T10:00' }
    })

    await waitFor(
      () => {
        const last = fake.updatedPosts[fake.updatedPosts.length - 1]
        expect(last?.State).toBe('scheduled')
        expect(last?.ScheduledAt).toBe('2026-11-01T10:00')
      },
      { timeout: 3000 }
    )
    expect(within(list).getByText('Scheduled')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'pending' } })

    await waitFor(
      () => expect(fake.updatedPosts[fake.updatedPosts.length - 1]?.State).toBe('pending'),
      { timeout: 3000 }
    )
    expect(fake.updatedPosts[fake.updatedPosts.length - 1]?.ScheduledAt).toBeNull()
    expect(screen.queryByLabelText('Scheduled at')).toBeNull()
  })
})

describe('post source', () => {
  const stories = [makeStory({ ID: 's1', Topic: 'Calm software', Text: 'Story body' })]
  const articles = [
    makeArticle({ ID: 'a1', StoryID: 's1', Title: 'Calm article', Text: 'Article body' })
  ]

  it('shows the source story of a post', async () => {
    const fake = createFakePort({
      stories,
      articles,
      posts: [makePost({ ID: 'p1', Topic: 'Launch note', StoryID: 's1' })]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Posts' }))
    const list = await screen.findByRole('listbox', { name: 'Posts' })
    fireEvent.click(within(list).getByRole('option', { name: /Launch note/ }))

    const pane = await screen.findByRole('region', { name: 'Source story' })

    expect(within(pane).getByText('Calm software')).toBeTruthy()
    expect(within(pane).getByText('Story body')).toBeTruthy()
  })

  it('shows the source article of a post', async () => {
    const fake = createFakePort({
      stories,
      articles,
      posts: [makePost({ ID: 'p1', Topic: 'Launch note', ArticleID: 'a1' })]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Posts' }))
    const list = await screen.findByRole('listbox', { name: 'Posts' })
    fireEvent.click(within(list).getByRole('option', { name: /Launch note/ }))

    const pane = await screen.findByRole('region', { name: 'Source article' })

    expect(within(pane).getByText('Calm article')).toBeTruthy()
    expect(within(pane).getByText('Article body')).toBeTruthy()
  })

  it('creates a post with a story source', async () => {
    const fake = createFakePort({ stories, articles, posts: [] })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Posts' }))
    await screen.findByText('No posts yet')
    fireEvent.click(screen.getByRole('button', { name: 'New Post' }))
    await screen.findByRole('region', { name: 'Post editor' })

    fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'story:s1' } })
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'Launch note' } })

    await waitFor(() => expect(fake.calls.createPost).toBe(1), { timeout: 3000 })

    expect(fake.createdPosts).toEqual([
      { topic: 'Launch note', text: '', storyId: 's1', articleId: null }
    ])
  })

  it('locks the source once the post leaves pending', async () => {
    const fake = createFakePort({
      stories,
      articles,
      posts: [makePost({ ID: 'p1', Topic: 'Launch note', StoryID: 's1' })]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Posts' }))
    const list = await screen.findByRole('listbox', { name: 'Posts' })
    fireEvent.click(within(list).getByRole('option', { name: /Launch note/ }))
    await screen.findByRole('region', { name: 'Post' })

    expect(screen.getByLabelText<HTMLSelectElement>('Source').disabled).toBe(false)

    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'scheduled' } })

    expect(screen.getByLabelText<HTMLSelectElement>('Source').disabled).toBe(true)
  })
})

describe('deleting a post', () => {
  it('deletes the post after the confirmation', async () => {
    const fake = createFakePort({
      stories: [],
      posts: [makePost({ ID: 'p1', Topic: 'Launch note' })]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Posts' }))
    const list = await screen.findByRole('listbox', { name: 'Posts' })

    fireEvent.click(within(list).getByRole('button', { name: 'Delete post “Launch note”' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete post' }))

    await waitFor(() => expect(fake.calls.deletePost).toBe(1), { timeout: 3000 })
    expect(fake.deletedPostIds).toEqual(['p1'])
    await waitFor(() => expect(screen.queryByRole('option', { name: /Launch note/ })).toBeNull())
    expect(await screen.findByText('No posts yet')).toBeTruthy()
  })
})

describe('library', () => {
  it('announces the active library and switches to articles', async () => {
    renderApp(createFakePort({ stories: [makeStory()] }).port)

    expect(screen.getByRole('button', { name: 'Stories' }).getAttribute('aria-current')).toBe(
      'page'
    )
    expect(screen.getByRole('button', { name: 'Articles' }).getAttribute('aria-current')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))

    expect(screen.getByRole('button', { name: 'Articles' }).getAttribute('aria-current')).toBe(
      'page'
    )
    expect(screen.getByRole('region', { name: 'Articles' })).toBeTruthy()
    expect(await screen.findByText('No articles yet')).toBeTruthy()
    expect(screen.queryByRole('listbox', { name: 'Stories' })).toBeNull()
  })
})

describe('story list', () => {
  it('lists the stories it loads from the port', async () => {
    const fake = createFakePort({
      stories: [
        makeStory({
          ID: 's1',
          Topic: 'Calm software',
          Text: 'Refactoring our relationship with feeds.'
        }),
        makeStory({ ID: 's2', Topic: 'Boring technology' })
      ]
    })

    renderApp(fake.port)

    const list = await screen.findByRole('listbox', { name: 'Stories' })

    expect(within(list).getAllByRole('option')).toHaveLength(2)
    expect(within(list).getByRole('option', { name: /Calm software/ })).toBeTruthy()
    expect(screen.getByText('(2)')).toBeTruthy()
  })

  it('announces that the stories are loading', async () => {
    const gate = createDeferred()
    const fake = createFakePort({
      stories: [makeStory({ Topic: 'Calm software' })],
      listStoriesGate: gate.promise
    })

    renderApp(fake.port)

    expect(screen.getByRole('status', { name: 'Loading stories' })).toBeTruthy()

    gate.resolve()

    expect(await screen.findByRole('option', { name: /Calm software/ })).toBeTruthy()
    expect(screen.queryByRole('status', { name: 'Loading stories' })).toBeNull()
  })

  it('says so when there are no stories', async () => {
    renderApp(createFakePort({ stories: [] }).port)

    expect(await screen.findByText('No stories yet')).toBeTruthy()
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('offers to retry when the stories cannot be loaded', async () => {
    const fake = createFakePort({
      stories: [makeStory({ Topic: 'Calm software' })],
      listStoriesFailures: 1
    })

    renderApp(fake.port)

    expect(await screen.findByRole('alert')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('option', { name: /Calm software/ })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(fake.calls.listStories).toBe(2)
  })

  it('selects a story with the mouse', async () => {
    const fake = createFakePort({
      stories: [
        makeStory({ ID: 's1', Topic: 'Calm software' }),
        makeStory({ ID: 's2', Topic: 'Boring technology' })
      ]
    })

    renderApp(fake.port)

    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))

    expect(
      screen.getByRole('option', { name: /Calm software/ }).getAttribute('aria-selected')
    ).toBe('true')
    expect(
      screen.getByRole('option', { name: /Boring technology/ }).getAttribute('aria-selected')
    ).toBe('false')
  })

  it('selects a story with the keyboard', async () => {
    const fake = createFakePort({
      stories: [
        makeStory({ ID: 's1', Topic: 'Calm software' }),
        makeStory({ ID: 's2', Topic: 'Boring technology' })
      ]
    })

    renderApp(fake.port)

    const first = await screen.findByRole('option', { name: /Calm software/ })
    first.focus()

    fireEvent.keyDown(first, { key: 'ArrowDown' })

    const second = screen.getByRole('option', { name: /Boring technology/ })
    expect(document.activeElement).toBe(second)

    fireEvent.keyDown(second, { key: 'Enter' })
    expect(
      screen.getByRole('option', { name: /Boring technology/ }).getAttribute('aria-selected')
    ).toBe('true')

    fireEvent.keyDown(second, { key: 'ArrowUp' })
    fireEvent.keyDown(first, { key: ' ' })
    expect(
      screen.getByRole('option', { name: /Calm software/ }).getAttribute('aria-selected')
    ).toBe('true')
  })

  it('keeps a single tab stop in the list', async () => {
    const fake = createFakePort({
      stories: [
        makeStory({ ID: 's1', Topic: 'Calm software' }),
        makeStory({ ID: 's2', Topic: 'Boring technology' })
      ]
    })

    renderApp(fake.port)

    await screen.findByRole('listbox', { name: 'Stories' })

    const options = screen.getAllByRole('option')

    expect(options.filter((option) => option.getAttribute('tabindex') === '0')).toHaveLength(1)
  })
})

describe('article list', () => {
  it('lists the articles alongside the stories', async () => {
    const fake = createFakePort({
      stories: [makeStory({ ID: 's1', Topic: 'Calm' })],
      articles: [
        makeArticle({ ID: 'a1', StoryID: 's1', Title: 'Calm software' }),
        makeArticle({ ID: 'a2', StoryID: 's1', Title: 'Boring technology' })
      ]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))

    const list = await screen.findByRole('listbox', { name: 'Articles' })

    expect(within(list).getAllByRole('option')).toHaveLength(2)
    expect(within(list).getByRole('option', { name: /Calm software/ })).toBeTruthy()
    expect(screen.getByText('(2)')).toBeTruthy()
  })
})

describe('tag filter', () => {
  const stories = [
    makeStory({ ID: 's1', Topic: 'Calm software', Tags: ['essays'] }),
    makeStory({ ID: 's2', Topic: 'Boring technology', Tags: ['tech'] })
  ]

  it('narrows the list to the chosen tag and clears it by pressing the tag again', async () => {
    renderApp(createFakePort({ stories }).port)

    await screen.findByRole('listbox', { name: 'Stories' })

    fireEvent.click(screen.getByRole('button', { name: 'tech' }))

    expect(screen.getByRole('option', { name: /Boring technology/ })).toBeTruthy()
    expect(screen.queryByRole('option', { name: /Calm software/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'tech' }))

    expect(screen.getByRole('option', { name: /Calm software/ })).toBeTruthy()
    expect(screen.getByRole('option', { name: /Boring technology/ })).toBeTruthy()
  })

  it('tells an empty filter apart from an empty library and offers to clear it', async () => {
    const fake = createFakePort({
      stories,
      articles: [makeArticle({ ID: 'a2', StoryID: 's2', Title: 'Raft notes' })]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    await screen.findByRole('listbox', { name: 'Articles' })

    fireEvent.click(screen.getByRole('button', { name: 'essays' }))

    expect(screen.getByText('No articles with this tag')).toBeTruthy()
    expect(screen.queryByText('No articles yet')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Clear filter' }))

    expect(screen.getByRole('option', { name: /Raft notes/ })).toBeTruthy()
  })

  it('filters articles by the tag of the story they come from', async () => {
    const fake = createFakePort({
      stories,
      articles: [
        makeArticle({ ID: 'a1', StoryID: 's1', Title: 'Calm software' }),
        makeArticle({ ID: 'a2', StoryID: 's2', Title: 'Raft notes' })
      ]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    await screen.findByRole('listbox', { name: 'Articles' })

    fireEvent.click(screen.getByRole('button', { name: 'essays' }))

    expect(screen.getByRole('option', { name: /Calm software/ })).toBeTruthy()
    expect(screen.queryByRole('option', { name: /Raft notes/ })).toBeNull()
  })
})

describe('creating a story', () => {
  const sidebarNewStoryButton = (): HTMLElement =>
    within(screen.getByRole('complementary', { name: 'Library' })).getByRole('button', {
      name: /New Story/
    })

  it('offers to start from the empty state and from the sidebar', async () => {
    renderApp(createFakePort({ stories: [] }).port)

    await screen.findByText('No stories yet')

    const list = screen.getByRole('region', { name: 'Stories' })

    expect(within(list).getByRole('button', { name: 'New Story' })).toBeTruthy()

    fireEvent.click(sidebarNewStoryButton())

    expect(await screen.findByRole('region', { name: 'Story editor' })).toBeTruthy()
  })

  it('saves the story as soon as it has a topic, with the body still empty', async () => {
    const fake = createFakePort({ stories: [] })

    renderApp(fake.port)
    fireEvent.click(sidebarNewStoryButton())
    await screen.findByRole('region', { name: 'Story editor' })

    expect(screen.getByText(/A topic is required/)).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'Calm software' } })

    await waitFor(
      () =>
        expect(fake.createdStories).toEqual([
          { topic: 'Calm software', titles: [], tags: [], text: '' }
        ]),
      { timeout: 3000 }
    )

    expect(await screen.findByRole('option', { name: /Calm software/ })).toBeTruthy()
  })

  it('writes nothing while the topic is missing, and asks before discarding', async () => {
    const fake = createFakePort({ stories: [] })

    renderApp(fake.port)
    fireEvent.click(sidebarNewStoryButton())
    await screen.findByRole('region', { name: 'Story editor' })

    act(() => replaceEditorText('Some thoughts with no topic yet'))

    await waitFor(() => expect(screen.getByText(/A topic is required/)).toBeTruthy())
    expect(fake.calls.createStory).toBe(0)

    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText(/discards them/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Discard and leave' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('region', { name: 'Articles' })).toBeTruthy()
  })

  it('reports a failed write without losing what was typed', async () => {
    const fake = createFakePort({ stories: [], createStoryFailures: 1 })

    renderApp(fake.port)
    fireEvent.click(sidebarNewStoryButton())
    await screen.findByRole('region', { name: 'Story editor' })

    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'Calm software' } })

    expect(await screen.findByRole('alert', undefined, { timeout: 3000 })).toBeTruthy()
    expect(screen.getByLabelText<HTMLInputElement>('Topic').value).toBe('Calm software')
  })
})

describe('source story pane', () => {
  const stories = [
    makeStory({
      ID: 's1',
      Topic: 'Calm software',
      Titles: ['Calm', 'Quiet tools'],
      Tags: ['essays'],
      Text: 'Raw thoughts.'
    })
  ]
  const articles = [makeArticle({ ID: 'a1', StoryID: 's1', Title: 'The architecture of calm' })]

  const openArticle = async (): Promise<HTMLElement> => {
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /The architecture of calm/ }))

    return await screen.findByRole('region', { name: 'Source story' })
  }

  it('shows the story the article comes from, with its provenance', async () => {
    renderApp(createFakePort({ stories, articles }).port)

    const pane = await openArticle()

    expect(within(pane).getByText('Calm software')).toBeTruthy()
    expect(within(pane).getByText('Quiet tools')).toBeTruthy()
    expect(within(pane).getByText('Raw thoughts.')).toBeTruthy()
    expect(within(pane).getByText('#s1')).toBeTruthy()
    expect(within(pane).getByText('Read-only')).toBeTruthy()
    expect(screen.getByText('derived from')).toBeTruthy()

    const articlePane = screen.getByRole('region', { name: 'Article' })

    expect(within(articlePane).getByText('#s1')).toBeTruthy()
    // The topic shows both in the header's provenance line and in the band's selector.
    expect(within(articlePane).getAllByText('Calm software').length).toBeGreaterThan(0)
    expect(within(articlePane).getByLabelText<HTMLSelectElement>('Story').value).toBe('s1')
  })

  it('says the source story is gone instead of breaking', async () => {
    const fake = createFakePort({
      stories: [],
      articles: [makeArticle({ ID: 'a1', StoryID: 'gone', Title: 'Orphan' })]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /Orphan/ }))

    const pane = await screen.findByRole('region', { name: 'Source story' })

    expect(within(pane).getByText(/no longer exists/)).toBeTruthy()
    expect(
      within(pane).getByRole<HTMLButtonElement>('button', { name: 'Copy source text' }).disabled
    ).toBe(true)
    expect(
      within(pane).getByRole<HTMLButtonElement>('button', { name: 'Open story in editor' }).disabled
    ).toBe(true)
    expect(
      within(pane).getByRole<HTMLButtonElement>('button', { name: 'Delete story' }).disabled
    ).toBe(true)
  })

  it('shows that the source story is loading without calling it missing', async () => {
    const gate = createDeferred()
    const fake = createFakePort({
      stories,
      articles,
      listStoriesGate: gate.promise
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /The architecture of calm/ }))

    const pane = await screen.findByRole('region', { name: 'Source story' })
    const loading = within(pane).getByRole('status')

    expect(loading.textContent).toContain('Loading source story')
    expect(loading.getAttribute('aria-busy')).toBe('true')
    expect(within(pane).queryByText(/no longer exists/)).toBeNull()
    expect(
      within(pane).getByRole<HTMLButtonElement>('button', { name: 'Copy source text' }).disabled
    ).toBe(true)
    expect(
      within(pane).getByRole<HTMLButtonElement>('button', { name: 'Open story in editor' }).disabled
    ).toBe(true)

    const toggle = within(pane).getByRole('button', { name: 'Toggle source story' })
    toggle.focus()
    fireEvent.click(toggle)
    gate.resolve()

    expect(await within(pane).findByText('Calm software')).toBeTruthy()
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(toggle)
  })

  it('offers to retry when the source story cannot be loaded', async () => {
    const fake = createFakePort({
      stories,
      articles,
      listStoriesFailures: 1
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /The architecture of calm/ }))

    const pane = await screen.findByRole('region', { name: 'Source story' })

    expect(within(pane).getByRole('alert')).toBeTruthy()
    expect(within(pane).getByText('Source story could not be loaded')).toBeTruthy()
    expect(within(pane).queryByText(/no longer exists/)).toBeNull()
    expect(
      within(pane).getByRole<HTMLButtonElement>('button', { name: 'Copy source text' }).disabled
    ).toBe(true)
    expect(
      within(pane).getByRole<HTMLButtonElement>('button', { name: 'Delete story' }).disabled
    ).toBe(true)

    fireEvent.click(within(pane).getByRole('button', { name: 'Try again' }))

    expect(await within(pane).findByText('Calm software')).toBeTruthy()
    expect(fake.calls.listStories).toBe(2)
  })

  it('does not offer to delete a source story that is gone', async () => {
    const fake = createFakePort({
      stories: [],
      articles: [makeArticle({ ID: 'a1', StoryID: 'gone', Title: 'Orphan' })]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /Orphan/ }))

    const pane = await screen.findByRole('region', { name: 'Source story' })

    expect(within(pane).getByRole('button', { name: 'Delete story' })).toHaveProperty(
      'disabled',
      true
    )
  })

  it('copies the source text and confirms it', async () => {
    const writeText = jest.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    renderApp(createFakePort({ stories, articles }).port)

    const pane = await openArticle()
    fireEvent.click(within(pane).getByRole('button', { name: 'Copy source text' }))

    expect(await within(pane).findByText('Copied')).toBeTruthy()
    expect(writeText).toHaveBeenCalledWith('Raw thoughts.')
  })

  it('lets the writer minimize and restore the source story pane', async () => {
    renderApp(createFakePort({ stories, articles }).port)

    const pane = await openArticle()
    const toggle = within(pane).getByRole('button', { name: 'Toggle source story' })

    expect(screen.getAllByRole('button', { name: 'Toggle source story' })).toHaveLength(1)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(toggle.getAttribute('aria-pressed')).toBeNull()
    expect(document.getElementById(toggle.getAttribute('aria-controls') ?? '')).toBeTruthy()

    toggle.focus()
    fireEvent.click(toggle)

    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(within(pane).queryByRole('button', { name: 'Copy source text' })).toBeNull()
    expect(document.activeElement).toBe(toggle)

    fireEvent.click(toggle)

    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(within(pane).getByRole('button', { name: 'Copy source text' })).toBeTruthy()
    expect(document.activeElement).toBe(toggle)
  })

  it('keeps the pane minimized while switching articles in the session', async () => {
    const twoArticles = [
      makeArticle({ ID: 'a1', StoryID: 's1', Title: 'The architecture of calm' }),
      makeArticle({ ID: 'a2', StoryID: 's1', Title: 'The quiet tools' })
    ]

    renderApp(createFakePort({ stories, articles: twoArticles }).port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /The architecture of calm/ }))

    const pane = await screen.findByRole('region', { name: 'Source story' })
    fireEvent.click(within(pane).getByRole('button', { name: 'Toggle source story' }))

    fireEvent.click(await screen.findByRole('option', { name: /The quiet tools/ }))

    const nextPane = screen.getByRole('region', { name: 'Source story' })
    const toggle = within(nextPane).getByRole('button', { name: 'Toggle source story' })

    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(within(nextPane).queryByRole('button', { name: 'Copy source text' })).toBeNull()
  })

  it('opens the source story in its editor from the pane header', async () => {
    renderApp(createFakePort({ stories, articles }).port)

    const pane = await openArticle()
    fireEvent.click(within(pane).getByRole('button', { name: 'Open story in editor' }))

    expect(await screen.findByRole('region', { name: 'Story editor' })).toBeTruthy()
    expect(screen.getByLabelText<HTMLInputElement>('Topic').value).toBe('Calm software')
  })
})

function articleView(): EditorView {
  const content = document.querySelector<HTMLElement>('.cm-content')
  const view = content === null ? null : EditorView.findFromDOM(content)

  if (view === null) {
    throw new Error('The editor is not mounted')
  }

  return view
}

function selectEditorText(anchor: number, head: number): void {
  articleView().dispatch({ selection: { anchor, head } })
}

function replaceEditorText(next: string): void {
  const view = articleView()

  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: next },
    selection: { anchor: next.length }
  })
}

async function startNewStory(): Promise<void> {
  const sidebar = screen.getByRole('complementary', { name: 'Library' })

  fireEvent.click(within(sidebar).getByRole('button', { name: /New Story/ }))
  await screen.findByRole('region', { name: 'Story editor' })
}

describe('editing an article', () => {
  const stories = [makeStory({ ID: 's1', Topic: 'Calm software' })]
  const articles = [
    makeArticle({
      ID: 'a1',
      StoryID: 's1',
      Title: 'The architecture of calm',
      Text: 'The article text.'
    })
  ]

  const openArticle = async (
    options: { updateArticleFailures?: number } = {}
  ): Promise<ReturnType<typeof createFakePort>> => {
    const fake = createFakePort({ stories, articles, ...options })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /The architecture of calm/ }))
    await screen.findByRole('textbox', { name: 'Article text' })

    return fake
  }

  it('opens the article in the editor and reports its metrics', async () => {
    await openArticle()

    expect(screen.getByRole('textbox', { name: 'Article text' }).textContent).toBe(
      'The article text.'
    )
    expect(screen.getByRole('contentinfo').textContent).toContain('Words: 3')
    expect(screen.getByRole('contentinfo').textContent).toContain('Chars: 17')
    expect(screen.getByRole('contentinfo').textContent).toContain('Reading: 1 min')
  })

  it('saves once after a burst of typing and confirms it', async () => {
    const fake = await openArticle()

    act(() => replaceEditorText('One'))
    act(() => replaceEditorText('One two'))

    await waitFor(() => expect(fake.calls.updateArticle).toBe(1), { timeout: 3000 })

    expect(fake.updatedArticles[0]?.Text).toBe('One two')
    expect(fake.updatedArticles[0]?.Title).toBe('The architecture of calm')
    expect(await screen.findByText('Saved')).toBeTruthy()
    expect(screen.getByRole('contentinfo').textContent).toContain('Words: 2')
  })

  it('shows where the cursor is', async () => {
    await openArticle()

    act(() => replaceEditorText('One two'))

    await waitFor(() =>
      expect(screen.getByRole('contentinfo').textContent).toContain('Ln 1, Col 8')
    )
  })

  it('saves an article whose body was emptied', async () => {
    const fake = await openArticle()

    act(() => replaceEditorText('   '))

    await waitFor(() => expect(fake.calls.updateArticle).toBe(1), { timeout: 3000 })
    expect(fake.updatedArticles[0]?.Text).toBe('   ')
  })

  it('offers to retry when a save fails, keeping what was typed', async () => {
    const fake = await openArticle({ updateArticleFailures: 1 })

    act(() => replaceEditorText('One two'))

    expect(await screen.findByRole('alert', undefined, { timeout: 3000 })).toBeTruthy()
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Article text' }).textContent).toBe('One two')

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(fake.calls.updateArticle).toBe(2))
    expect(fake.updatedArticles[0]?.Text).toBe('One two')
  })
})

describe('article target', () => {
  const stories = [makeStory({ ID: 's1', Topic: 'Calm software' })]
  const articles = [
    makeArticle({
      ID: 'a1',
      StoryID: 's1',
      Title: 'The architecture of calm',
      Target: 'Convince the reader',
      Text: 'The article text.'
    })
  ]

  const openArticle = async (): Promise<ReturnType<typeof createFakePort>> => {
    const fake = createFakePort({ stories, articles })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /The architecture of calm/ }))
    await screen.findByRole('textbox', { name: 'Article text' })

    return fake
  }

  it('shows the target below the source story', async () => {
    await openArticle()

    const source = screen.getByRole('region', { name: 'Source story' })
    const target = within(source).getByRole('region', { name: 'Target' })

    expect(within(target).getByText('Convince the reader')).toBeTruthy()
    expect(within(target).getByRole('button', { name: 'Edit target' })).toBeTruthy()
  })

  it('saves an edited target through the autosave without touching the article text', async () => {
    const fake = await openArticle()
    const target = within(screen.getByRole('region', { name: 'Source story' })).getByRole(
      'region',
      {
        name: 'Target'
      }
    )

    fireEvent.click(within(target).getByRole('button', { name: 'Edit target' }))
    fireEvent.change(within(target).getByRole('textbox', { name: 'Target' }), {
      target: { value: 'Make the reader think' }
    })
    fireEvent.click(within(target).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(fake.calls.updateArticle).toBe(1), { timeout: 3000 })

    expect(fake.updatedArticles[0]?.Target).toBe('Make the reader think')
    expect(fake.updatedArticles[0]?.Title).toBe('The architecture of calm')
    expect(fake.updatedArticles[0]?.Text).toBe('The article text.')
  })

  it('cancels an edit without writing and restores the previous target', async () => {
    const fake = await openArticle()
    const target = within(screen.getByRole('region', { name: 'Source story' })).getByRole(
      'region',
      {
        name: 'Target'
      }
    )

    fireEvent.click(within(target).getByRole('button', { name: 'Edit target' }))
    fireEvent.change(within(target).getByRole('textbox', { name: 'Target' }), {
      target: { value: 'Throw this away' }
    })
    fireEvent.click(within(target).getByRole('button', { name: 'Cancel' }))

    expect(within(target).getByText('Convince the reader')).toBeTruthy()
    expect(within(target).queryByRole('textbox', { name: 'Target' })).toBeNull()
    expect(fake.calls.updateArticle).toBe(0)
  })

  it('adds a target to an article that does not have one', async () => {
    const fake = createFakePort({
      stories,
      articles: [
        makeArticle({
          ID: 'a1',
          StoryID: 's1',
          Title: 'The architecture of calm',
          Target: '',
          Text: 'The article text.'
        })
      ]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /The architecture of calm/ }))
    await screen.findByRole('textbox', { name: 'Article text' })

    const target = within(screen.getByRole('region', { name: 'Source story' })).getByRole(
      'region',
      {
        name: 'Target'
      }
    )

    expect(within(target).getByText('No target yet.')).toBeTruthy()

    fireEvent.click(within(target).getByRole('button', { name: 'Add target' }))
    fireEvent.change(within(target).getByRole('textbox', { name: 'Target' }), {
      target: { value: 'A first target' }
    })
    fireEvent.click(within(target).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(fake.calls.updateArticle).toBe(1), { timeout: 3000 })
    expect(fake.updatedArticles[0]?.Target).toBe('A first target')
  })

  it('persists a cleared target and returns to the empty state', async () => {
    const fake = await openArticle()
    const target = within(screen.getByRole('region', { name: 'Source story' })).getByRole(
      'region',
      { name: 'Target' }
    )

    fireEvent.click(within(target).getByRole('button', { name: 'Edit target' }))
    fireEvent.change(within(target).getByRole('textbox', { name: 'Target' }), {
      target: { value: '   ' }
    })
    fireEvent.click(within(target).getByRole('button', { name: 'Save' }))

    expect(within(target).getByText('No target yet.')).toBeTruthy()
    await waitFor(() => expect(fake.calls.updateArticle).toBe(1), { timeout: 3000 })
    expect(fake.updatedArticles[0]?.Target).toBe('')
  })

  it('keeps a target defined while creating until the article can be saved', async () => {
    const fake = createFakePort({ stories, articles: [] })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    await screen.findByText('No articles yet')
    fireEvent.click(screen.getByRole('button', { name: 'New Article' }))
    await screen.findByRole('region', { name: 'Article editor' })

    const target = within(screen.getByRole('region', { name: 'Source story' })).getByRole(
      'region',
      {
        name: 'Target'
      }
    )

    fireEvent.click(within(target).getByRole('button', { name: 'Add target' }))
    fireEvent.change(within(target).getByRole('textbox', { name: 'Target' }), {
      target: { value: 'Persuade the reader' }
    })
    fireEvent.click(within(target).getByRole('button', { name: 'Save' }))

    expect(fake.calls.createArticle).toBe(0)

    fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's1' } })
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Calm' } })

    await waitFor(() => expect(fake.calls.createArticle).toBe(1), { timeout: 3000 })
    expect(fake.createdArticles[0]?.target).toBe('Persuade the reader')
  })

  it('drops an edit in progress when another article is opened', async () => {
    const fake = createFakePort({
      stories,
      articles: [
        makeArticle({
          ID: 'a1',
          StoryID: 's1',
          Title: 'The architecture of calm',
          Target: 'Convince the reader',
          Text: 'The article text.'
        }),
        makeArticle({
          ID: 'a2',
          StoryID: 's1',
          Title: 'The quiet editor',
          Target: 'Describe the editor',
          Text: 'Another article.'
        })
      ]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /The architecture of calm/ }))
    await screen.findByRole('textbox', { name: 'Article text' })

    const source = screen.getByRole('region', { name: 'Source story' })
    const target = within(source).getByRole('region', { name: 'Target' })

    fireEvent.click(within(target).getByRole('button', { name: 'Edit target' }))
    fireEvent.change(within(target).getByRole('textbox', { name: 'Target' }), {
      target: { value: 'Never saved' }
    })

    fireEvent.click(screen.getByRole('option', { name: /The quiet editor/ }))
    await screen.findByRole('textbox', { name: 'Article text' })

    const nextTarget = within(screen.getByRole('region', { name: 'Source story' })).getByRole(
      'region',
      { name: 'Target' }
    )

    expect(within(nextTarget).getByText('Describe the editor')).toBeTruthy()
    expect(within(nextTarget).queryByRole('textbox', { name: 'Target' })).toBeNull()
    expect(fake.calls.updateArticle).toBe(0)
  })

  it('hides with the source pane and comes back when it is expanded', async () => {
    await openArticle()

    const source = screen.getByRole('region', { name: 'Source story' })

    fireEvent.click(within(source).getByRole('button', { name: 'Toggle source story' }))
    expect(screen.queryByRole('region', { name: 'Target' })).toBeNull()

    fireEvent.click(within(source).getByRole('button', { name: 'Toggle source story' }))
    expect(screen.getByRole('region', { name: 'Target' })).toBeTruthy()
  })

  it('does not appear on the post screen', async () => {
    const fake = createFakePort({
      stories: [],
      posts: [makePost({ ID: 'p1', Topic: 'Launch note', Text: 'Short body' })]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Posts' }))
    fireEvent.click(await screen.findByRole('option', { name: /Launch note/ }))
    await screen.findByRole('region', { name: 'Post editor' })

    expect(screen.queryByRole('region', { name: 'Target' })).toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Target' })).toBeNull()
  })
})

describe('view modes', () => {
  const stories = [makeStory({ ID: 's1', Topic: 'Calm software' })]
  const markdown = '# Calm\n\n**sturdy** and ~~old~~\n\n| a | b |\n| - | - |\n| 1 | 2 |'
  const articles = [
    makeArticle({ ID: 'a1', StoryID: 's1', Title: 'The architecture of calm', Text: markdown })
  ]

  const openArticle = async (): Promise<void> => {
    renderApp(createFakePort({ stories, articles }).port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /The architecture of calm/ }))
    await screen.findByRole('textbox', { name: 'Article text' })
  }

  it('starts in split view with the rendered preview beside the editor', async () => {
    await openArticle()

    expect(screen.getByRole('button', { name: 'Split' }).getAttribute('aria-pressed')).toBe('true')

    const preview = screen.getByRole('region', { name: 'Preview' })

    expect(within(preview).getByRole('heading', { level: 1, name: 'Calm' })).toBeTruthy()
  })

  it('renders gfm tables, emphasis and strikethrough', async () => {
    await openArticle()

    const preview = screen.getByRole('region', { name: 'Preview' })

    expect(within(preview).getByRole('table')).toBeTruthy()
    expect(within(preview).getByText('sturdy').tagName).toBe('STRONG')
    expect(within(preview).getByText('old').tagName).toBe('DEL')
  })

  it('renders a single newline as a line break in the preview', async () => {
    renderApp(
      createFakePort({
        stories,
        articles: [
          makeArticle({
            ID: 'a2',
            StoryID: 's1',
            Title: 'Line breaks',
            Text: 'first line\nsecond line'
          })
        ]
      }).port
    )
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /Line breaks/ }))
    await screen.findByRole('textbox', { name: 'Article text' })

    const preview = screen.getByRole('region', { name: 'Preview' })
    const paragraph = within(preview).getByText(/first line/)

    expect(paragraph.querySelector('br')).not.toBeNull()
  })

  it('hides the preview in edit mode', async () => {
    await openArticle()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('button', { name: 'Edit' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByRole('region', { name: 'Preview' })).toBeNull()
  })

  it('keeps the document and the editor when switching modes', async () => {
    await openArticle()

    act(() => replaceEditorText('Hello **world**'))
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    expect(screen.getByRole('textbox', { name: 'Article text' }).textContent).toContain('Hello')
    expect(within(screen.getByRole('region', { name: 'Preview' })).getByText('world').tagName).toBe(
      'STRONG'
    )
  })
})

describe('story view modes', () => {
  const markdown =
    '# Calm\n\n**sturdy** and *gentle* and ~~old~~\n\n| a | b |\n| - | - |\n| 1 | 2 |'
  const stories = [makeStory({ ID: 's1', Topic: 'Calm software', Text: markdown })]
  const articles = [
    makeArticle({ ID: 'a1', StoryID: 's1', Title: 'The architecture of calm', Text: 'Old body' })
  ]

  const pickStory = async (): Promise<void> => {
    const list = await screen.findByRole('listbox', { name: 'Stories' })

    fireEvent.click(within(list).getByRole('option', { name: /Calm software/ }))
    await screen.findByRole('region', { name: 'Story editor' })
  }

  const openStoredStory = async (): Promise<ReturnType<typeof createFakePort>> => {
    const fake = createFakePort({ stories, articles })

    renderApp(fake.port)
    await pickStory()

    return fake
  }

  const inheritViewModeFromArticle = async (label: 'Edit' | 'Preview'): Promise<void> => {
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))

    const articleList = await screen.findByRole('listbox', { name: 'Articles' })

    fireEvent.click(within(articleList).getByRole('option', { name: /The architecture of calm/ }))

    const switcher = await screen.findByRole('group', { name: 'View mode' })

    fireEvent.click(within(switcher).getByRole('button', { name: label }))
    fireEvent.click(screen.getByRole('button', { name: 'Stories' }))
    await pickStory()
  }

  it('shows the rendered preview beside the editor while creating a story', async () => {
    renderApp(createFakePort({ stories: [] }).port)
    await startNewStory()

    expect(screen.getByRole('textbox', { name: 'Article text' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Preview' })).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'View mode' })).toBeNull()

    act(() => replaceEditorText('# Calm\n\n**sturdy** and ~~old~~'))

    const preview = screen.getByRole('region', { name: 'Preview' })

    expect(within(preview).getByRole('heading', { level: 1, name: 'Calm' })).toBeTruthy()
    expect(within(preview).getByText('sturdy').tagName).toBe('STRONG')
  })

  it('renders the text of the stored story it opens', async () => {
    await openStoredStory()

    expect(screen.getByRole('textbox', { name: 'Article text' }).textContent).toContain('Calm')

    const preview = screen.getByRole('region', { name: 'Preview' })

    expect(within(preview).getByRole('heading', { level: 1, name: 'Calm' })).toBeTruthy()
  })

  it('renders gfm tables, emphasis and strikethrough', async () => {
    await openStoredStory()

    const preview = screen.getByRole('region', { name: 'Preview' })

    expect(within(preview).getByRole('table')).toBeTruthy()
    expect(within(preview).getByText('sturdy').tagName).toBe('STRONG')
    expect(within(preview).getByText('gentle').tagName).toBe('EM')
    expect(within(preview).getByText('old').tagName).toBe('DEL')
  })

  it('renders lists, quotes, inline code, links and rules of the stored story', async () => {
    const richText = [
      '- first point',
      '- second point',
      '',
      '1. step one',
      '2. step two',
      '',
      '> a quoted line',
      '',
      'Run `pnpm test` and read [the docs](https://example.com).',
      '',
      '---'
    ].join('\n')

    renderApp(
      createFakePort({
        stories: [makeStory({ ID: 's1', Topic: 'Calm software', Text: richText })]
      }).port
    )
    await pickStory()

    const preview = screen.getByRole('region', { name: 'Preview' })
    const lists = within(preview).getAllByRole('list')

    expect(lists.map((list) => list.tagName)).toEqual(['UL', 'OL'])
    expect(within(preview).getAllByRole('listitem')).toHaveLength(4)
    expect(within(preview).getByRole('blockquote').textContent).toContain('a quoted line')
    expect(within(preview).getByText('pnpm test').tagName).toBe('CODE')
    expect(within(preview).getByRole('link', { name: 'the docs' }).getAttribute('href')).toBe(
      'https://example.com'
    )
    expect(within(preview).getByRole('separator')).toBeTruthy()
  })

  it('updates the preview as the writer types, before the save lands', async () => {
    const fake = await openStoredStory()

    act(() => replaceEditorText('Hello **world**'))

    expect(within(screen.getByRole('region', { name: 'Preview' })).getByText('world').tagName).toBe(
      'STRONG'
    )
    expect(fake.calls.updateStory).toBe(0)

    await waitFor(() => expect(fake.updatedStories[0]?.Text).toBe('Hello **world**'), {
      timeout: 3000
    })
  })

  it('renders an empty preview for a story with no text', async () => {
    renderApp(
      createFakePort({
        stories: [makeStory({ ID: 's1', Topic: 'Calm software', Text: '' })]
      }).port
    )
    await pickStory()

    expect(screen.getByRole('region', { name: 'Preview' }).textContent).toBe('')
  })

  it('hides the preview in edit mode', async () => {
    renderApp(createFakePort({ stories, articles }).port)
    await inheritViewModeFromArticle('Edit')

    expect(screen.queryByRole('region', { name: 'Preview' })).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Article text' }).textContent).toContain('Calm')
  })

  it('hides the editor and the tools when only the preview is shown', async () => {
    renderApp(createFakePort({ stories, articles }).port)
    await inheritViewModeFromArticle('Preview')

    const preview = screen.getByRole('region', { name: 'Preview' })

    expect(within(preview).getByRole('heading', { level: 1, name: 'Calm' })).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Formatting' })).toBeNull()
  })

  describe('the story header', () => {
    const storySwitcher = (): HTMLElement =>
      within(screen.getByRole('region', { name: 'Story' })).getByRole('group', {
        name: 'View mode'
      })

    const pressedMode = (label: 'Edit' | 'Split' | 'Preview'): string | null =>
      within(storySwitcher()).getByRole('button', { name: label }).getAttribute('aria-pressed')

    it('shows the topic and the view mode switcher of the stored story', async () => {
      await openStoredStory()

      const pane = screen.getByRole('region', { name: 'Story' })

      expect(within(pane).getByRole('heading', { level: 2, name: 'Calm software' })).toBeTruthy()
      expect(within(storySwitcher()).getAllByRole('button')).toHaveLength(3)

      const header = within(pane)
        .getByRole('heading', { level: 2, name: 'Calm software' })
        .closest('header')
      expect(header).not.toBeNull()
      const headerScope = within(header as HTMLElement)

      expect(headerScope.queryByRole('button', { name: 'Delete story' })).toBeNull()
      expect(headerScope.queryByRole('button', { name: 'Duplicate story' })).toBeNull()
      expect(headerScope.queryByRole('button', { name: 'Toggle source pane' })).toBeNull()
    })

    it('hides the preview and keeps the editor and the tools in edit mode', async () => {
      await openStoredStory()

      fireEvent.click(within(storySwitcher()).getByRole('button', { name: 'Edit' }))

      expect(pressedMode('Edit')).toBe('true')
      expect(screen.queryByRole('region', { name: 'Preview' })).toBeNull()
      expect(screen.getByRole('group', { name: 'Formatting' })).toBeTruthy()
      expect(screen.getByRole('textbox', { name: 'Article text' }).textContent).toContain('Calm')
    })

    it('hides the editor and the tools and leaves only the preview in preview mode', async () => {
      await openStoredStory()

      fireEvent.click(within(storySwitcher()).getByRole('button', { name: 'Preview' }))

      expect(pressedMode('Preview')).toBe('true')
      expect(screen.queryByRole('group', { name: 'Formatting' })).toBeNull()

      const preview = screen.getByRole('region', { name: 'Preview' })

      expect(within(preview).getByRole('heading', { level: 1, name: 'Calm' })).toBeTruthy()
    })

    it('brings the editor, the tools and the preview back in split mode', async () => {
      await openStoredStory()

      fireEvent.click(within(storySwitcher()).getByRole('button', { name: 'Preview' }))
      fireEvent.click(within(storySwitcher()).getByRole('button', { name: 'Split' }))

      expect(pressedMode('Split')).toBe('true')
      expect(screen.getByRole('group', { name: 'Formatting' })).toBeTruthy()
      expect(screen.getByRole('textbox', { name: 'Article text' }).textContent).toContain('Calm')
      expect(screen.getByRole('region', { name: 'Preview' })).toBeTruthy()
    })

    it('mounts no header while creating a story', async () => {
      renderApp(createFakePort({ stories: [] }).port)
      await startNewStory()

      expect(screen.queryByRole('region', { name: 'Story' })).toBeNull()
      expect(screen.queryByRole('group', { name: 'View mode' })).toBeNull()
      expect(screen.getByRole('region', { name: 'Preview' })).toBeTruthy()
    })

    it('keeps the view mode when switching between a story and an article', async () => {
      renderApp(createFakePort({ stories, articles }).port)
      await pickStory()

      fireEvent.click(within(storySwitcher()).getByRole('button', { name: 'Preview' }))
      fireEvent.click(screen.getByRole('button', { name: 'Articles' }))

      const articleList = await screen.findByRole('listbox', { name: 'Articles' })

      fireEvent.click(within(articleList).getByRole('option', { name: /The architecture of calm/ }))
      await screen.findByRole('region', { name: 'Article editor' })

      expect(screen.getByRole('button', { name: 'Preview' }).getAttribute('aria-pressed')).toBe(
        'true'
      )

      fireEvent.click(screen.getByRole('button', { name: 'Stories' }))
      await pickStory()

      expect(pressedMode('Preview')).toBe('true')
    })
  })
})

describe('formatting toolbar', () => {
  const stories = [makeStory({ ID: 's1', Topic: 'Calm software' })]
  const articles = [
    makeArticle({ ID: 'a1', StoryID: 's1', Title: 'The architecture of calm', Text: 'hello world' })
  ]

  const openArticle = async (): Promise<void> => {
    renderApp(createFakePort({ stories, articles }).port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /The architecture of calm/ }))
    await screen.findByRole('textbox', { name: 'Article text' })
  }

  it('wraps the selection and takes the formatting away again', async () => {
    await openArticle()

    act(() => selectEditorText(0, 5))
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))

    expect(articleView().state.doc.toString()).toBe('**hello** world')

    act(() => selectEditorText(2, 7))
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))

    expect(articleView().state.doc.toString()).toBe('hello world')
  })

  it('inserts a placeholder when nothing is selected', async () => {
    await openArticle()

    act(() => selectEditorText(11, 11))
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))

    expect(articleView().state.doc.toString()).toBe('hello world**bold text**')
  })

  it('prefixes the selected lines with a heading', async () => {
    await openArticle()

    act(() => selectEditorText(0, 0))
    fireEvent.click(screen.getByRole('button', { name: 'Heading' }))

    expect(articleView().state.doc.toString()).toBe('## hello world')
  })

  it('keeps every tool named for keyboard and screen reader users', async () => {
    await openArticle()

    const toolbar = screen.getByRole('group', { name: 'Formatting' })

    for (const name of [
      'Bold',
      'Italic',
      'Heading',
      'Link',
      'Blockquote',
      'Inline code',
      'Code block',
      'Bulleted list',
      'Task checkbox'
    ]) {
      expect(within(toolbar).getByRole('button', { name })).toBeTruthy()
    }
  })

  it('hides the tools when only the preview is shown', async () => {
    await openArticle()

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    expect(screen.queryByRole('group', { name: 'Formatting' })).toBeNull()
  })
})

describe('creating an article', () => {
  const stories = [
    makeStory({ ID: 's1', Topic: 'Calm software' }),
    makeStory({ ID: 's2', Topic: 'Boring technology' })
  ]

  const openNewArticle = async (fake: ReturnType<typeof createFakePort>): Promise<void> => {
    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    await screen.findByText('No articles yet')
    fireEvent.click(screen.getByRole('button', { name: 'New Article' }))
    await screen.findByRole('region', { name: 'Article editor' })
  }

  it('shows the source story pane while creating, empty until a story is chosen', async () => {
    const fake = createFakePort({ stories, articles: [] })

    await openNewArticle(fake)

    const pane = screen.getByRole('region', { name: 'Source story' })

    expect(within(pane).getByText('No source story yet')).toBeTruthy()
    expect(within(pane).queryByText(/no longer exists/)).toBeNull()

    fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's2' } })

    expect(within(pane).getByText('Boring technology')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Story'), { target: { value: '' } })

    expect(within(pane).getByText('No source story yet')).toBeTruthy()
    expect(within(pane).queryByText('#s2')).toBeNull()
  })

  it('opens the source story pane from the sidebar new article action', async () => {
    const fake = createFakePort({ stories, articles: [] })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    await screen.findByText('No articles yet')

    fireEvent.click(
      within(screen.getByRole('complementary', { name: 'Library' })).getByRole('button', {
        name: /New Article/
      })
    )

    await screen.findByRole('region', { name: 'Article editor' })

    const pane = screen.getByRole('region', { name: 'Source story' })

    expect(within(pane).getByText('No source story yet')).toBeTruthy()
  })

  it('shows the preselected story in the pane before saving', async () => {
    const fake = createFakePort({ stories, articles: [] })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Boring technology/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    await screen.findByText('No articles yet')
    fireEvent.click(screen.getByRole('button', { name: 'New Article' }))
    await screen.findByRole('region', { name: 'Article editor' })

    const pane = screen.getByRole('region', { name: 'Source story' })

    expect(screen.getByLabelText<HTMLSelectElement>('Story').value).toBe('s2')
    expect(within(pane).getByText('Boring technology')).toBeTruthy()
  })

  it('keeps the source pane and its story when the article is saved', async () => {
    const fake = createFakePort({ stories, articles: [] })

    await openNewArticle(fake)

    fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's2' } })
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Calm' } })

    const pane = screen.getByRole('region', { name: 'Source story' })
    expect(within(pane).getByText('Boring technology')).toBeTruthy()

    await waitFor(() => expect(fake.calls.createArticle).toBe(1), { timeout: 3000 })
    await waitFor(() =>
      expect(screen.getByLabelText<HTMLSelectElement>('Story').disabled).toBe(true)
    )

    expect(screen.getByRole('region', { name: 'Source story' })).toBe(pane)
    expect(within(pane).getByText('Boring technology')).toBeTruthy()
  })

  it('keeps the source pane read-only while creating', async () => {
    const fake = createFakePort({ stories, articles: [] })

    await openNewArticle(fake)

    const pane = screen.getByRole('region', { name: 'Source story' })
    const copy = within(pane).getByRole<HTMLButtonElement>('button', {
      name: 'Copy source text'
    })

    expect(within(pane).queryByRole('button', { name: 'Open story in editor' })).toBeNull()
    expect(within(pane).queryByRole('button', { name: 'Delete story' })).toBeNull()
    expect(copy.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's1' } })

    expect(
      within(pane).getByRole<HTMLButtonElement>('button', { name: 'Copy source text' }).disabled
    ).toBe(false)
  })

  it('clears the copied confirmation when the source story changes', async () => {
    const writeText = jest.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const fake = createFakePort({ stories, articles: [] })

    await openNewArticle(fake)

    fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's1' } })

    const pane = screen.getByRole('region', { name: 'Source story' })
    fireEvent.click(within(pane).getByRole('button', { name: 'Copy source text' }))

    expect(await within(pane).findByText('Copied')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's2' } })

    expect(within(pane).queryByText('Copied')).toBeNull()

    fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's1' } })

    expect(within(pane).queryByText('Copied')).toBeNull()
  })

  it('keeps the pane minimized when the created article is saved', async () => {
    const fake = createFakePort({ stories, articles: [] })

    await openNewArticle(fake)

    fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's1' } })
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Calm' } })

    const pane = screen.getByRole('region', { name: 'Source story' })
    fireEvent.click(within(pane).getByRole('button', { name: 'Toggle source story' }))

    await waitFor(() => expect(fake.calls.createArticle).toBe(1), { timeout: 3000 })
    await waitFor(() =>
      expect(screen.getByLabelText<HTMLSelectElement>('Story').disabled).toBe(true)
    )

    expect(screen.getByRole('region', { name: 'Source story' })).toBe(pane)
    expect(
      within(pane)
        .getByRole('button', { name: 'Toggle source story' })
        .getAttribute('aria-expanded')
    ).toBe('false')
  })

  it('expands the pane for a new article after it was minimized', async () => {
    const fake = createFakePort({ stories, articles: [] })

    await openNewArticle(fake)

    fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's1' } })
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'First' } })

    await waitFor(() => expect(fake.calls.createArticle).toBe(1), { timeout: 3000 })
    await waitFor(() =>
      expect(screen.getByLabelText<HTMLSelectElement>('Story').disabled).toBe(true)
    )

    const pane = screen.getByRole('region', { name: 'Source story' })
    fireEvent.click(within(pane).getByRole('button', { name: 'Toggle source story' }))
    expect(
      within(pane)
        .getByRole('button', { name: 'Toggle source story' })
        .getAttribute('aria-expanded')
    ).toBe('false')

    fireEvent.click(screen.getByRole('button', { name: 'New Article' }))
    await screen.findByRole('region', { name: 'Article editor' })

    const nextPane = screen.getByRole('region', { name: 'Source story' })

    expect(
      within(nextPane)
        .getByRole('button', { name: 'Toggle source story' })
        .getAttribute('aria-expanded')
    ).toBe('true')
  })

  it('creates the article from the story the writer picks, and opens it', async () => {
    const fake = createFakePort({ stories, articles: [] })

    await openNewArticle(fake)

    fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's2' } })
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'The architecture of calm' }
    })

    await waitFor(
      () =>
        expect(fake.createdArticles).toEqual([
          { storyId: 's2', title: 'The architecture of calm', subtitle: '', target: '', text: '' }
        ]),
      { timeout: 3000 }
    )

    expect(await screen.findByRole('option', { name: /The architecture of calm/ })).toBeTruthy()
  })

  it('writes nothing until it has both a story and a title, and says so', async () => {
    const fake = createFakePort({ stories, articles: [] })

    await openNewArticle(fake)

    expect(screen.getByText(/A story and a title are required/)).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's1' } })
    await waitFor(() => expect(screen.getByText(/A story and a title are required/)).toBeTruthy())
    expect(fake.calls.createArticle).toBe(0)

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Calm' } })

    await waitFor(() => expect(fake.calls.createArticle).toBe(1), { timeout: 3000 })
  })

  it('pre-selects the story already in context', async () => {
    const fake = createFakePort({ stories, articles: [] })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Boring technology/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    await screen.findByText('No articles yet')
    fireEvent.click(screen.getByRole('button', { name: 'New Article' }))

    await screen.findByRole('region', { name: 'Article editor' })

    expect(screen.getByLabelText<HTMLSelectElement>('Story').value).toBe('s2')
  })

  it('locks the story selector once the article exists', async () => {
    const fake = createFakePort({ stories, articles: [] })

    await openNewArticle(fake)

    fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's1' } })
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Calm' } })

    await waitFor(() => expect(fake.calls.createArticle).toBe(1), { timeout: 3000 })
    await waitFor(() =>
      expect(screen.getByLabelText<HTMLSelectElement>('Story').disabled).toBe(true)
    )
  })
})

describe('the sidebar new action', () => {
  const stories = [
    makeStory({ ID: 's1', Topic: 'Calm software' }),
    makeStory({ ID: 's2', Topic: 'Boring technology' })
  ]

  const sidebarNewButton = (): HTMLElement =>
    within(screen.getByRole('complementary', { name: 'Library' })).getByRole('button', {
      name: /^New (Story|Article)/
    })

  const switchToArticles = async (): Promise<void> => {
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    await screen.findByText('No articles yet')
  }

  it('says New Article with the articles library and starts an article from the sidebar', async () => {
    const fake = createFakePort({ stories, articles: [] })

    renderApp(fake.port)
    await switchToArticles()

    const button = sidebarNewButton()

    expect(within(button).getByText('New Article')).toBeTruthy()
    expect(within(button).getByText('Ctrl N')).toBeTruthy()
    expect(button.getAttribute('aria-label')).toBe('New Article (Ctrl N)')
    expect(button.getAttribute('title')).toBe('New Article (Ctrl N)')

    fireEvent.click(button)

    await screen.findByRole('region', { name: 'Article editor' })
  })

  it('keeps New Story and its shortcut with the stories library', () => {
    renderApp(createFakePort({ stories }).port)

    const button = sidebarNewButton()

    expect(within(button).getByText('New Story')).toBeTruthy()
    expect(within(button).getByText('Ctrl N')).toBeTruthy()
    expect(button.getAttribute('aria-label')).toBe('New Story (Ctrl N)')
    expect(button.getAttribute('title')).toBe('New Story (Ctrl N)')
  })

  it('pre-selects the story selected in the library when no article is open', async () => {
    const fake = createFakePort({ stories, articles: [] })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Boring technology/ }))
    await switchToArticles()

    fireEvent.click(sidebarNewButton())

    await screen.findByRole('region', { name: 'Article editor' })
    expect(screen.getByLabelText<HTMLSelectElement>('Story').value).toBe('s2')
  })

  it('pre-selects the story of the open article over the selected story', async () => {
    const fake = createFakePort({
      stories,
      articles: [makeArticle({ ID: 'a1', StoryID: 's1', Title: 'The architecture of calm' })]
    })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Boring technology/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /The architecture of calm/ }))
    await screen.findByRole('textbox', { name: 'Article text' })

    fireEvent.click(sidebarNewButton())

    await screen.findByRole('region', { name: 'Article editor' })
    expect(screen.getByLabelText<HTMLSelectElement>('Story').value).toBe('s1')
  })

  it('opens with no pre-selection when the story of the open article is gone', async () => {
    const fake = createFakePort({
      stories: [makeStory({ ID: 's2', Topic: 'Boring technology' })],
      articles: [makeArticle({ ID: 'a1', StoryID: 'gone', Title: 'Orphan' })]
    })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Boring technology/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /Orphan/ }))
    await screen.findByRole('textbox', { name: 'Article text' })

    fireEvent.click(sidebarNewButton())

    await screen.findByRole('region', { name: 'Article editor' })
    expect(screen.getByLabelText<HTMLSelectElement>('Story').value).toBe('')
  })

  it('is disabled with the articles library and no story, and starts nothing', async () => {
    const fake = createFakePort({ stories: [], articles: [] })

    renderApp(fake.port)
    await switchToArticles()

    const button = sidebarNewButton()

    expect(button).toHaveProperty('disabled', true)

    fireEvent.click(button)

    expect(screen.queryByRole('region', { name: 'Article editor' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Story editor' })).toBeNull()
    expect(fake.calls.createArticle).toBe(0)
  })

  it('enables the action when the stories arrive after the library switch', async () => {
    const gate = createDeferred()
    const fake = createFakePort({ stories, articles: [], listStoriesGate: gate.promise })

    renderApp(fake.port)
    await switchToArticles()

    expect(sidebarNewButton()).toHaveProperty('disabled', true)

    gate.resolve()

    await waitFor(() => expect(sidebarNewButton()).toHaveProperty('disabled', false))
  })

  it('asks before discarding an unsaved draft, then creates the article', async () => {
    const fake = createFakePort({
      stories,
      articles: [makeArticle({ ID: 'a1', StoryID: 's1', Title: 'The architecture of calm' })]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /The architecture of calm/ }))
    await screen.findByRole('textbox', { name: 'Article text' })

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: '' } })

    fireEvent.click(sidebarNewButton())

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText(/discards them/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Discard and leave' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('region', { name: 'Article editor' })).toBeTruthy()
    expect(screen.getByLabelText<HTMLSelectElement>('Story').value).toBe('s1')
    expect(screen.getByLabelText<HTMLInputElement>('Title').value).toBe('')
  })

  it('keeps the contextual name and tooltip with the sidebar collapsed', async () => {
    const fake = createFakePort({ stories, articles: [] })

    renderApp(fake.port)
    await switchToArticles()

    fireEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }))

    const button = sidebarNewButton()

    expect(button.getAttribute('aria-label')).toBe('New Article (Ctrl N)')
    expect(button.getAttribute('title')).toBe('New Article (Ctrl N)')
  })
})

describe('the New Article button', () => {
  it('says a story is missing when there is none to write from', async () => {
    const fake = createFakePort({
      stories: [],
      articles: [makeArticle({ ID: 'a1', StoryID: 'gone', Title: 'Orphan' })]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))

    const button = await screen.findByRole('button', { name: 'New Article' })

    expect(button).toHaveProperty('disabled', true)
    expect(screen.getByText('No story yet')).toBeTruthy()
    expect(fake.calls.createArticle).toBe(0)
  })

  it('is disabled and explains itself from the empty list too', async () => {
    const fake = createFakePort({ stories: [], articles: [] })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    await screen.findByText('No articles yet')

    expect(screen.getByRole('button', { name: 'New Article' })).toHaveProperty('disabled', true)
    expect(screen.getByText(/A story is required/)).toBeTruthy()
  })
})

describe('deleting', () => {
  const stories = [makeStory({ ID: 's1', Topic: 'Calm software' })]
  const articles = [makeArticle({ ID: 'a1', StoryID: 's1', Title: 'The architecture of calm' })]
  const moreStories = [
    makeStory({ ID: 's1', Topic: 'Calm software' }),
    makeStory({ ID: 's2', Topic: 'Boring technology' })
  ]

  const openArticle = async (fake: ReturnType<typeof createFakePort>): Promise<void> => {
    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /The architecture of calm/ }))
    await screen.findByRole('textbox', { name: 'Article text' })
  }

  it('deletes the article once the writer confirms', async () => {
    const fake = createFakePort({ stories, articles })

    await openArticle(fake)

    const articlePane = screen.getByRole('region', { name: 'Article' })
    fireEvent.click(within(articlePane).getByRole('button', { name: 'Delete article' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/cannot be undone/)).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete article' }))

    await waitFor(() => expect(fake.deletedArticleIds).toEqual(['a1']))
    expect(await screen.findByText('No articles yet')).toBeTruthy()
  })

  it('keeps the article when the confirmation is cancelled', async () => {
    const fake = createFakePort({ stories, articles })

    await openArticle(fake)

    const articlePane = screen.getByRole('region', { name: 'Article' })
    fireEvent.click(within(articlePane).getByRole('button', { name: 'Delete article' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    expect(fake.calls.deleteArticle).toBe(0)
    expect(screen.getByRole('region', { name: 'Article' })).toBeTruthy()
  })

  it('closes the confirmation with Escape', async () => {
    const fake = createFakePort({ stories, articles })

    await openArticle(fake)

    const articlePane = screen.getByRole('region', { name: 'Article' })
    fireEvent.click(within(articlePane).getByRole('button', { name: 'Delete article' }))

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fake.calls.deleteArticle).toBe(0)
  })

  it('says so when the item is already gone, and refreshes the list', async () => {
    const fake = createFakePort({ stories, articles, deleteArticleFailures: 1 })

    await openArticle(fake)

    const articlePane = screen.getByRole('region', { name: 'Article' })
    fireEvent.click(within(articlePane).getByRole('button', { name: 'Delete article' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete article' })
    )

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy()
  })

  it('warns that deleting a story takes its articles with it', async () => {
    const fake = createFakePort({ stories, articles })

    await openArticle(fake)

    fireEvent.click(screen.getByRole('button', { name: 'Delete story' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/every article written from it/)).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete story' }))

    await waitFor(() => expect(fake.deletedStoryIds).toEqual(['s1']))

    fireEvent.click(screen.getByRole('button', { name: 'Stories' }))
    expect(await screen.findByText('No stories yet')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    expect(await screen.findByText('No articles yet')).toBeTruthy()
  })

  it('keeps the story when the editor deletion is cancelled', async () => {
    const fake = createFakePort({ stories, articles })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))
    const editor = await screen.findByRole('region', { name: 'Story editor' })

    fireEvent.click(within(editor).getByRole('button', { name: 'Delete story' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    expect(fake.calls.deleteStory).toBe(0)
    expect(screen.getByRole('region', { name: 'Story editor' })).toBeTruthy()
  })

  it('closes the editor confirmation with Escape', async () => {
    const fake = createFakePort({ stories, articles })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))
    const editor = await screen.findByRole('region', { name: 'Story editor' })

    fireEvent.click(within(editor).getByRole('button', { name: 'Delete story' }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fake.calls.deleteStory).toBe(0)
  })

  it('says so when the story is already gone, and keeps the editor', async () => {
    const fake = createFakePort({ stories, articles, deleteStoryFailures: 1 })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))
    const editor = await screen.findByRole('region', { name: 'Story editor' })

    fireEvent.click(within(editor).getByRole('button', { name: 'Delete story' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete story' })
    )

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Story editor' })).toBeTruthy()
  })

  it('deletes the story from its editor once the writer confirms', async () => {
    const fake = createFakePort({ stories, articles })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))
    const editor = await screen.findByRole('region', { name: 'Story editor' })

    fireEvent.click(within(editor).getByRole('button', { name: 'Delete story' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/Calm software/)).toBeTruthy()
    expect(within(dialog).getByText(/every article written from it/)).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete story' }))

    await waitFor(() => expect(fake.deletedStoryIds).toEqual(['s1']))

    expect(screen.queryByRole('region', { name: 'Story editor' })).toBeNull()
    expect(await screen.findByText('No stories yet')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    expect(await screen.findByText('No articles yet')).toBeTruthy()
  })

  it('deletes the story from its row without disturbing the selected story', async () => {
    const fake = createFakePort({ stories: moreStories })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))
    await screen.findByRole('region', { name: 'Story editor' })

    expect(screen.getByRole('button', { name: 'Delete story “Calm software”' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Delete story “Boring technology”' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Delete story.*Boring technology/ }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/Boring technology/)).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete story' }))

    await waitFor(() => expect(fake.deletedStoryIds).toEqual(['s2']))
    await waitFor(() =>
      expect(screen.queryByRole('option', { name: /Boring technology/ })).toBeNull()
    )

    expect(
      screen.getByRole('option', { name: /Calm software/ }).getAttribute('aria-selected')
    ).toBe('true')
    expect(screen.getByLabelText<HTMLInputElement>('Topic').value).toBe('Calm software')
  })

  it('deletes the selected story from its row and shows the empty list', async () => {
    const fake = createFakePort({ stories })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))
    await screen.findByRole('region', { name: 'Story editor' })

    fireEvent.click(screen.getByRole('button', { name: 'Delete story “Calm software”' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete story' })
    )

    await waitFor(() => expect(fake.deletedStoryIds).toEqual(['s1']))

    expect(await screen.findByText('No stories yet')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Story editor' })).toBeNull()
  })

  it('keeps the selection when the row deletion is cancelled', async () => {
    const fake = createFakePort({ stories: moreStories })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))
    await screen.findByRole('region', { name: 'Story editor' })

    fireEvent.click(screen.getByRole('button', { name: 'Delete story “Boring technology”' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    expect(fake.calls.deleteStory).toBe(0)
    expect(
      screen.getByRole('option', { name: /Calm software/ }).getAttribute('aria-selected')
    ).toBe('true')
    expect(screen.getByLabelText<HTMLInputElement>('Topic').value).toBe('Calm software')
  })

  it('deletes the articles of the story deleted from its row', async () => {
    const fake = createFakePort({
      stories: moreStories,
      articles: [makeArticle({ ID: 'a2', StoryID: 's2', Title: 'Boring article' })]
    })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))
    await screen.findByRole('region', { name: 'Story editor' })

    fireEvent.click(screen.getByRole('button', { name: 'Delete story “Boring technology”' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete story' })
    )

    await waitFor(() => expect(fake.deletedStoryIds).toEqual(['s2']))

    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    expect(await screen.findByText('No articles yet')).toBeTruthy()
  })

  it('clears the article when its source story is deleted from the row', async () => {
    const fake = createFakePort({
      stories: moreStories,
      articles: [makeArticle({ ID: 'a2', StoryID: 's2', Title: 'Boring article' })]
    })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /Boring article/ }))
    await screen.findByRole('region', { name: 'Article editor' })

    fireEvent.click(screen.getByRole('button', { name: 'Stories' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete story “Boring technology”' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete story' })
    )

    await waitFor(() => expect(fake.deletedStoryIds).toEqual(['s2']))

    await waitFor(() => expect(screen.queryByRole('region', { name: 'Article editor' })).toBeNull())
    expect(screen.getByText('Nothing selected')).toBeTruthy()
  })

  it('says so when the story deleted from its row is already gone', async () => {
    const fake = createFakePort({ stories: moreStories, deleteStoryFailures: 1 })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))
    await screen.findByRole('region', { name: 'Story editor' })

    fireEvent.click(screen.getByRole('button', { name: 'Delete story “Boring technology”' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete story' })
    )

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy()
    expect(screen.getByLabelText<HTMLInputElement>('Topic').value).toBe('Calm software')
    expect(screen.getByRole('option', { name: /Boring technology/ })).toBeTruthy()
  })

  it('does not select a row when its delete action receives the keyboard', async () => {
    const fake = createFakePort({ stories: moreStories })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))
    await screen.findByRole('region', { name: 'Story editor' })

    fireEvent.focus(screen.getByRole('option', { name: /Boring technology/ }))
    const button = screen.getByRole('button', { name: /Delete story.*Boring technology/ })

    fireEvent.keyDown(button, { key: 'Enter' })
    fireEvent.keyDown(button, { key: ' ' })

    expect(
      screen.getByRole('option', { name: /Calm software/ }).getAttribute('aria-selected')
    ).toBe('true')
    expect(screen.getByLabelText<HTMLInputElement>('Topic').value).toBe('Calm software')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps an unrelated article open when the selected story is deleted', async () => {
    const fake = createFakePort({
      stories: moreStories,
      articles: [makeArticle({ ID: 'a2', StoryID: 's2', Title: 'Boring article' })]
    })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))
    await screen.findByRole('region', { name: 'Story editor' })

    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /Boring article/ }))
    await screen.findByRole('region', { name: 'Article editor' })

    fireEvent.click(screen.getByRole('button', { name: 'Stories' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete story “Calm software”' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete story' })
    )

    await waitFor(() => expect(fake.deletedStoryIds).toEqual(['s1']))

    expect(screen.getByRole('region', { name: 'Article editor' })).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('option', { name: /Calm software/ })).toBeNull())
  })

  describe('from the article row', () => {
    const rowStories = [
      makeStory({ ID: 's1', Topic: 'Calm software', Tags: ['essays'] }),
      makeStory({ ID: 's2', Topic: 'Boring technology', Tags: ['tech'] })
    ]
    const rowArticles = [
      makeArticle({
        ID: 'a1',
        StoryID: 's1',
        Title: 'The architecture of calm',
        Text: 'First excerpt.'
      }),
      makeArticle({
        ID: 'a2',
        StoryID: 's2',
        Title: 'Boring article',
        Text: 'Second excerpt.'
      })
    ]

    const openRowArticle = async (fake: ReturnType<typeof createFakePort>): Promise<void> => {
      renderApp(fake.port)
      fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
      fireEvent.click(await screen.findByRole('option', { name: /The architecture of calm/ }))
      await screen.findByRole('region', { name: 'Article editor' })
    }

    const rowDelete = (title: string): HTMLElement =>
      screen.getByRole('button', { name: new RegExp(`Delete article.*${title}`) })

    it('names each row action with the title and the source story topic', async () => {
      const fake = createFakePort({ stories: rowStories, articles: rowArticles })

      renderApp(fake.port)
      fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
      const list = await screen.findByRole('listbox', { name: 'Articles' })

      expect(
        within(list).getByRole('button', {
          name: 'Delete article “The architecture of calm” from “Calm software”'
        })
      ).toBeTruthy()
      expect(
        within(list).getByRole('button', {
          name: 'Delete article “Boring article” from “Boring technology”'
        })
      ).toBeTruthy()

      const calmRow = within(list).getByRole('option', { name: /The architecture of calm/ })
      expect(calmRow.textContent).not.toContain('essays')
    })

    it('distinguishes row actions for articles with the same title in different stories', async () => {
      const fake = createFakePort({
        stories: rowStories,
        articles: [
          makeArticle({ ID: 'a1', StoryID: 's1', Title: 'Shared title' }),
          makeArticle({ ID: 'a2', StoryID: 's2', Title: 'Shared title' })
        ]
      })

      renderApp(fake.port)
      fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
      const list = await screen.findByRole('listbox', { name: 'Articles' })

      const calmAction = within(list).getByRole('button', {
        name: 'Delete article “Shared title” from “Calm software”'
      })
      const boringAction = within(list).getByRole('button', {
        name: 'Delete article “Shared title” from “Boring technology”'
      })

      expect(calmAction).not.toBe(boringAction)
      expect(
        within(list).getAllByRole('button', { name: /Delete article “Shared title”/ })
      ).toHaveLength(2)
    })

    it('falls back to the title when the source story is unavailable', async () => {
      const fake = createFakePort({
        stories: [],
        articles: [makeArticle({ ID: 'a3', StoryID: 'missing', Title: 'Orphan article' })]
      })

      renderApp(fake.port)
      fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
      await screen.findByRole('listbox', { name: 'Articles' })

      expect(screen.getByRole('button', { name: 'Delete article “Orphan article”' })).toBeTruthy()
    })

    it('deletes an unselected row and keeps the open article and its editor', async () => {
      const fake = createFakePort({ stories: rowStories, articles: rowArticles })

      await openRowArticle(fake)

      fireEvent.click(rowDelete('Boring article'))

      const dialog = screen.getByRole('dialog')
      expect(
        within(dialog).getByText('Delete “Boring article”? This cannot be undone.')
      ).toBeTruthy()
      expect(
        screen.getByRole('option', { name: /Boring article/ }).getAttribute('aria-selected')
      ).toBe('false')

      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete article' }))

      await waitFor(() => expect(fake.deletedArticleIds).toEqual(['a2']))
      await waitFor(() =>
        expect(screen.queryByRole('option', { name: /Boring article/ })).toBeNull()
      )

      expect(
        screen
          .getByRole('option', { name: /The architecture of calm/ })
          .getAttribute('aria-selected')
      ).toBe('true')
      expect(screen.getByRole('region', { name: 'Article editor' })).toBeTruthy()
      expect(screen.getByRole('textbox', { name: 'Article text' }).textContent).toBe(
        'First excerpt.'
      )
    })

    it('deletes the selected row, unmounts its editor and shows the empty list', async () => {
      const fake = createFakePort({
        stories: [rowStories[0]],
        articles: [rowArticles[0]]
      })

      await openRowArticle(fake)

      fireEvent.click(rowDelete('The architecture of calm'))
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText(/The architecture of calm/)).toBeTruthy()
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete article' }))

      await waitFor(() => expect(fake.deletedArticleIds).toEqual(['a1']))

      expect(await screen.findByText('No articles yet')).toBeTruthy()
      expect(screen.queryByRole('region', { name: 'Article editor' })).toBeNull()
      expect(screen.getByText('Nothing selected')).toBeTruthy()
    })

    it('keeps the selection when the row deletion is cancelled', async () => {
      const fake = createFakePort({ stories: rowStories, articles: rowArticles })

      await openRowArticle(fake)

      fireEvent.click(rowDelete('Boring article'))
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

      expect(fake.calls.deleteArticle).toBe(0)
      expect(
        screen
          .getByRole('option', { name: /The architecture of calm/ })
          .getAttribute('aria-selected')
      ).toBe('true')
      expect(screen.getByRole('region', { name: 'Article editor' })).toBeTruthy()
    })

    it('closes a row deletion with Escape without deleting', async () => {
      const fake = createFakePort({ stories: rowStories, articles: rowArticles })

      await openRowArticle(fake)

      fireEvent.click(rowDelete('Boring article'))
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

      expect(fake.calls.deleteArticle).toBe(0)
      expect(
        screen
          .getByRole('option', { name: /The architecture of calm/ })
          .getAttribute('aria-selected')
      ).toBe('true')
    })

    it('keeps the row and the open article when the deletion fails', async () => {
      const fake = createFakePort({
        stories: rowStories,
        articles: rowArticles,
        deleteArticleFailures: 1
      })

      await openRowArticle(fake)
      const listCalls = fake.calls.listArticles

      fireEvent.click(rowDelete('Boring article'))
      fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete article' })
      )

      expect(await screen.findByRole('alert')).toBeTruthy()
      expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy()
      expect(screen.getByRole('dialog')).toBeTruthy()
      expect(screen.getByRole('option', { name: /Boring article/ })).toBeTruthy()
      expect(screen.getByRole('region', { name: 'Article editor' })).toBeTruthy()
      expect(screen.getByRole('textbox', { name: 'Article text' }).textContent).toBe(
        'First excerpt.'
      )
      await waitFor(() => expect(fake.calls.listArticles).toBeGreaterThan(listCalls))
    })

    it('opens the dialog from a native row-action button without changing the selection', async () => {
      const fake = createFakePort({ stories: rowStories, articles: rowArticles })

      await openRowArticle(fake)
      fireEvent.focus(screen.getByRole('option', { name: /Boring article/ }))
      const button = rowDelete('Boring article')

      expect(button.tagName).toBe('BUTTON')
      expect(button.getAttribute('type')).toBe('button')

      fireEvent.click(button)

      const dialog = screen.getByRole('dialog')
      expect(
        within(dialog).getByText('Delete “Boring article”? This cannot be undone.')
      ).toBeTruthy()
      expect(
        screen
          .getByRole('option', { name: /The architecture of calm/ })
          .getAttribute('aria-selected')
      ).toBe('true')
      expect(screen.getByRole('region', { name: 'Article editor' })).toBeTruthy()
      expect(fake.calls.deleteArticle).toBe(0)
    })

    it('keeps a draft in progress when the selected row is deleted', async () => {
      const fake = createFakePort({ stories: rowStories, articles: rowArticles })

      await openRowArticle(fake)

      fireEvent.click(screen.getByRole('button', { name: 'New Article' }))
      await screen.findByRole('region', { name: 'Article editor' })
      fireEvent.change(screen.getByLabelText('Subtitle'), {
        target: { value: 'Draft in progress' }
      })

      fireEvent.click(rowDelete('The architecture of calm'))
      fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete article' })
      )

      await waitFor(() => expect(fake.deletedArticleIds).toEqual(['a1']))
      await waitFor(() =>
        expect(screen.queryByRole('option', { name: /The architecture of calm/ })).toBeNull()
      )

      expect(fake.calls.createArticle).toBe(0)
      expect(screen.getByRole('region', { name: 'Article editor' })).toBeTruthy()
      expect(screen.getByLabelText<HTMLInputElement>('Subtitle').value).toBe('Draft in progress')
    })

    it('shows the filtered empty state when the last visible row is deleted', async () => {
      const fake = createFakePort({ stories: rowStories, articles: rowArticles })

      renderApp(fake.port)
      fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
      await screen.findByRole('listbox', { name: 'Articles' })

      fireEvent.click(screen.getByRole('button', { name: 'essays' }))
      expect(screen.getByRole('option', { name: /The architecture of calm/ })).toBeTruthy()
      expect(screen.queryByRole('option', { name: /Boring article/ })).toBeNull()

      fireEvent.click(rowDelete('The architecture of calm'))
      fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete article' })
      )

      await waitFor(() => expect(fake.deletedArticleIds).toEqual(['a1']))

      expect(await screen.findByText('No articles with this tag')).toBeTruthy()
      expect(screen.queryByText('No articles yet')).toBeNull()
    })

    it('keeps the filtered empty state when the last article overall is deleted', async () => {
      const fake = createFakePort({
        stories: [makeStory({ ID: 's1', Topic: 'Calm software', Tags: ['essays'] })],
        articles: [makeArticle({ ID: 'a1', StoryID: 's1', Title: 'The architecture of calm' })]
      })

      renderApp(fake.port)
      fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
      await screen.findByRole('listbox', { name: 'Articles' })

      fireEvent.click(screen.getByRole('button', { name: 'essays' }))
      fireEvent.click(rowDelete('The architecture of calm'))
      fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete article' })
      )

      await waitFor(() => expect(fake.deletedArticleIds).toEqual(['a1']))

      expect(await screen.findByText('No articles with this tag')).toBeTruthy()
      expect(screen.queryByText('No articles yet')).toBeNull()
    })
  })
})

describe('keyboard shortcuts', () => {
  const stories = [makeStory({ ID: 's1', Topic: 'Calm software' })]
  const articles = [
    makeArticle({
      ID: 'a1',
      StoryID: 's1',
      Title: 'The architecture of calm',
      Text: 'The article text.'
    })
  ]

  it('starts a new story with the platform modifier', async () => {
    renderApp(createFakePort().port)

    fireEvent.keyDown(document.body, { key: 'n', ctrlKey: true })

    expect(await screen.findByRole('region', { name: 'Story editor' })).toBeTruthy()
  })

  it('starts a new article from the story in context when the articles library is open', async () => {
    const fake = createFakePort({ stories, articles: [] })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    await screen.findByText('No articles yet')

    fireEvent.keyDown(document.body, { key: 'n', ctrlKey: true })

    await screen.findByRole('region', { name: 'Article editor' })
    expect(screen.getByLabelText<HTMLSelectElement>('Story').value).toBe('s1')

    const pane = screen.getByRole('region', { name: 'Source story' })
    expect(within(pane).getByText('Calm software')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'The architecture of calm' }
    })

    await waitFor(
      () =>
        expect(fake.createdArticles).toEqual([
          { storyId: 's1', title: 'The architecture of calm', subtitle: '', target: '', text: '' }
        ]),
      { timeout: 3000 }
    )
  })

  it('starts a new article from the open article story, like the sidebar button', async () => {
    const fake = createFakePort({
      stories: [
        makeStory({ ID: 's1', Topic: 'Calm software' }),
        makeStory({ ID: 's2', Topic: 'Boring technology' })
      ],
      articles: [makeArticle({ ID: 'a1', StoryID: 's1', Title: 'The architecture of calm' })]
    })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Boring technology/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /The architecture of calm/ }))
    await screen.findByRole('textbox', { name: 'Article text' })

    fireEvent.keyDown(document.body, { key: 'n', ctrlKey: true })

    await screen.findByRole('region', { name: 'Article editor' })
    expect(screen.getByLabelText<HTMLSelectElement>('Story').value).toBe('s1')
  })

  it('leaves the story unselected when the open article story is gone', async () => {
    const fake = createFakePort({
      stories: [makeStory({ ID: 's2', Topic: 'Boring technology' })],
      articles: [makeArticle({ ID: 'a1', StoryID: 'gone', Title: 'Orphan' })]
    })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Boring technology/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /Orphan/ }))
    await screen.findByRole('textbox', { name: 'Article text' })

    fireEvent.keyDown(document.body, { key: 'n', ctrlKey: true })

    await screen.findByRole('region', { name: 'Article editor' })
    expect(screen.getByLabelText<HTMLSelectElement>('Story').value).toBe('')
  })

  it('asks before discarding an unsaved story draft, and writes nothing', async () => {
    const fake = createFakePort({ stories: [] })

    renderApp(fake.port)
    fireEvent.click(
      within(screen.getByRole('complementary', { name: 'Library' })).getByRole('button', {
        name: /New Story/
      })
    )
    await screen.findByRole('region', { name: 'Story editor' })

    act(() => replaceEditorText('Some thoughts with no topic yet'))

    await waitFor(() => expect(screen.getByText(/A topic is required/)).toBeTruthy())

    fireEvent.keyDown(document.body, { key: 'n', ctrlKey: true })

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText(/discards them/)).toBeTruthy()
    expect(fake.calls.createStory).toBe(0)
    expect(fake.createdStories).toEqual([])
  })

  it('consumes the key without creating anything when there is no story to write from', async () => {
    const fake = createFakePort({ stories: [], articles: [] })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    await screen.findByText('No articles yet')

    expect(fireEvent.keyDown(document.body, { key: 'n', ctrlKey: true })).toBe(false)

    expect(screen.queryByRole('region', { name: 'Article editor' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Story editor' })).toBeNull()
    expect(fake.calls.createArticle).toBe(0)
    expect(fake.calls.createStory).toBe(0)
  })

  it('forces a save of the open article without waiting for the pause', async () => {
    const fake = createFakePort({ stories, articles })

    renderApp(fake.port)
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    fireEvent.click(await screen.findByRole('option', { name: /The architecture of calm/ }))
    await screen.findByRole('textbox', { name: 'Article text' })

    act(() => replaceEditorText('One two'))
    fireEvent.keyDown(document.body, { key: 's', ctrlKey: true })

    await waitFor(() => expect(fake.calls.updateArticle).toBe(1), { timeout: 500 })
    expect(fake.updatedArticles[0]?.Text).toBe('One two')
  })

  it('does nothing when there is no article to save', () => {
    renderApp(createFakePort().port)

    fireEvent.keyDown(document.body, { key: 's', ctrlKey: true })

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the modifier this platform actually uses', () => {
    renderApp(createFakePort({ stories }).port)

    const sidebar = screen.getByRole('complementary', { name: 'Library' })

    expect(within(sidebar).getByText('Ctrl N')).toBeTruthy()
  })
})

describe('the story editor', () => {
  const stories = [
    makeStory({ ID: 's1', Topic: 'Calm software', Text: 'Old body', Tags: ['essays'] })
  ]

  const openStory = async (fake: ReturnType<typeof createFakePort>): Promise<void> => {
    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))
    await screen.findByRole('region', { name: 'Story editor' })
  }

  it('switches to the story the writer selects', async () => {
    const fake = createFakePort({
      stories: [
        makeStory({ ID: 's1', Topic: 'Calm software', Text: 'First body' }),
        makeStory({ ID: 's2', Topic: 'Boring technology', Text: 'Second body' })
      ]
    })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))
    await screen.findByRole('region', { name: 'Story editor' })

    fireEvent.click(screen.getByRole('option', { name: /Boring technology/ }))

    await waitFor(() =>
      expect(screen.getByLabelText<HTMLInputElement>('Topic').value).toBe('Boring technology')
    )
  })

  it('writes out a pending change when the writer moves away', async () => {
    const fake = createFakePort({
      stories: [
        makeStory({ ID: 's1', Topic: 'Calm software', Text: 'First body' }),
        makeStory({ ID: 's2', Topic: 'Boring technology', Text: 'Second body' })
      ]
    })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))
    await screen.findByRole('region', { name: 'Story editor' })

    act(() => replaceEditorText('Typed and left at once'))
    fireEvent.click(screen.getByRole('option', { name: /Boring technology/ }))

    await waitFor(() => expect(fake.updatedStories[0]?.Text).toBe('Typed and left at once'))
  })

  it('creates nothing when the editor is opened and left alone', async () => {
    const fake = createFakePort({ stories: [] })

    renderApp(fake.port)
    await startNewStory()

    expect(fake.calls.createStory).toBe(0)
  })

  it('does not offer to delete a story that is being created', async () => {
    const fake = createFakePort({ stories: [] })

    renderApp(fake.port)
    await startNewStory()

    expect(screen.queryByRole('button', { name: 'Delete story' })).toBeNull()
  })

  it('edits the story text and saves it', async () => {
    const fake = createFakePort({ stories })

    await openStory(fake)

    act(() => replaceEditorText('A rewritten body'))

    await waitFor(() => expect(fake.updatedStories[0]?.Text).toBe('A rewritten body'), {
      timeout: 3000
    })
    expect(fake.updatedStories[0]?.Topic).toBe('Calm software')
  })

  it('sends the titles and tags the writer adds', async () => {
    const fake = createFakePort({ stories: [] })

    renderApp(fake.port)
    await startNewStory()

    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'Calm software' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add title' }))
    fireEvent.change(screen.getByLabelText('Title 1'), {
      target: { value: 'The architecture of calm' }
    })
    fireEvent.change(screen.getByLabelText('Add a tag'), { target: { value: 'essays' } })
    fireEvent.keyDown(screen.getByLabelText('Add a tag'), { key: 'Enter' })

    await waitFor(
      () =>
        expect(fake.createdStories).toEqual([
          {
            topic: 'Calm software',
            titles: ['The architecture of calm'],
            tags: ['essays'],
            text: ''
          }
        ]),
      { timeout: 3000 }
    )
  })

  it('asks before leaving when a stored story loses its topic', async () => {
    const fake = createFakePort({ stories })

    await openStory(fake)

    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(fake.calls.updateStory).toBe(0)
  })

  it('does not send a save twice when leaving while it is in flight', async () => {
    const gate = createDeferred()
    const fake = createFakePort({
      stories: [
        makeStory({ ID: 's1', Topic: 'Calm software', Text: 'Body' }),
        makeStory({ ID: 's2', Topic: 'Boring technology' })
      ],
      updateStoryGate: gate.promise
    })

    renderApp(fake.port)
    fireEvent.click(await screen.findByRole('option', { name: /Calm software/ }))
    await screen.findByRole('region', { name: 'Story editor' })

    act(() => replaceEditorText('Typed once'))
    await waitFor(() => expect(fake.calls.updateStory).toBe(1), { timeout: 3000 })

    fireEvent.click(screen.getByRole('option', { name: /Boring technology/ }))
    gate.resolve()

    await waitFor(() => expect(fake.updatedStories.length).toBe(1))
    expect(fake.calls.updateStory).toBe(1)
  })

  it('will not save an emptied topic of a stored story, and warns', async () => {
    const fake = createFakePort({ stories })

    await openStory(fake)

    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: '   ' } })

    await waitFor(() => expect(screen.getByText(/A topic is required/)).toBeTruthy())
    expect(fake.calls.updateStory).toBe(0)
  })
})

describe('sorting', () => {
  it('reverses the order by updated date', async () => {
    const fake = createFakePort({
      stories: [
        makeStory({ ID: 's1', Topic: 'Older', UpdatedAt: '2024-10-01T10:00:00' }),
        makeStory({ ID: 's2', Topic: 'Newer', UpdatedAt: '2024-12-01T10:00:00' })
      ]
    })

    renderApp(fake.port)

    const list = await screen.findByRole('listbox', { name: 'Stories' })
    const titles = (): string[] =>
      within(list)
        .getAllByRole('option')
        .map((option) => option.textContent ?? '')

    expect(titles()[0]).toContain('Newer')

    fireEvent.click(screen.getByRole('button', { name: /Sort by updated date/ }))

    expect(titles()[0]).toContain('Older')
  })
})
