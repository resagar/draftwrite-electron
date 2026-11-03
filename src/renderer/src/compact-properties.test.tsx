import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { expect, it } from '@jest/globals'
import { createFakePort } from './data/fake/fake-port'
import { renderApp } from './test/render-app'
import { makeArticle, makePost, makeStory } from './data/fake/factories'

it('preserves Story properties, an unfinished tag and focus across folding and creation', async () => {
  const fake = createFakePort({ stories: [] })
  renderApp(fake.port)
  await act(async () => {
    fireEvent.click(
      within(screen.getByRole('complementary', { name: 'Library' })).getByRole('button', {
        name: /New Story/
      })
    )
  })
  const toggle = screen.getByRole('button', { name: 'Story properties' })
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByRole('button', { name: 'Add title' })).toBeNull()
  expect(screen.getByLabelText('Topic')).toBeTruthy()

  fireEvent.click(toggle)
  fireEvent.click(screen.getByRole('button', { name: 'Add title' }))
  fireEvent.change(screen.getByLabelText('Title 1'), { target: { value: 'A title' } })
  fireEvent.change(screen.getByLabelText('Add a tag'), { target: { value: 'unfinished' } })
  fireEvent.click(toggle)
  expect(document.activeElement === toggle).toBe(true)
  expect(screen.queryByRole('textbox', { name: 'Title 1' })).toBeNull()
  expect(screen.getByText('1 title · 0 tags')).toBeTruthy()

  fireEvent.click(toggle)
  expect((screen.getByLabelText('Title 1') as HTMLInputElement).value).toBe('A title')
  expect((screen.getByLabelText('Add a tag') as HTMLInputElement).value).toBe('unfinished')
  fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'A story' } })
  const title = screen.getByLabelText('Title 1') as HTMLInputElement
  act(() => title.focus())
  title.setSelectionRange(2, 4)
  await screen.findByRole('region', { name: 'Story' }, { timeout: 3000 })
  expect(toggle.getAttribute('aria-expanded')).toBe('true')
  expect(document.activeElement === title).toBe(true)
  expect([title.selectionStart, title.selectionEnd]).toEqual([2, 4])

  fireEvent.keyDown(screen.getByLabelText('Add a tag'), { key: 'Enter' })
  await waitFor(() => expect(fake.updatedStories.at(-1)?.Tags).toEqual(['unfinished']), {
    timeout: 3000
  })
  expect(fake.createdStories[0]).toMatchObject({ titles: ['A title'], tags: [] })
  expect(screen.getByText('1 title · 1 tag')).toBeTruthy()
  await screen.findByText('Saved')
})

it.each(['story', 'article'] as const)(
  'keeps a Post %s source summary accurate outside the active tag filter',
  async (sourceKind) => {
    const fake = createFakePort({
      stories: [
        makeStory({ ID: 's1', Topic: 'Linked story', Tags: ['essays'] }),
        makeStory({ ID: 's2', Topic: 'Other story', Tags: ['tech'] })
      ],
      articles: [makeArticle({ ID: 'a1', StoryID: 's1', Title: 'Linked article' })],
      posts: [
        makePost({
          ID: 'p1',
          Topic: 'Linked post',
          StoryID: sourceKind === 'story' ? 's1' : null,
          ArticleID: sourceKind === 'article' ? 'a1' : null
        })
      ]
    })
    renderApp(fake.port)
    await screen.findByRole('listbox', { name: 'Stories' })
    fireEvent.click(screen.getByRole('button', { name: 'tech' }))
    fireEvent.click(screen.getByRole('button', { name: 'Posts' }))
    const list = await screen.findByRole('listbox', { name: 'Posts' })
    await act(async () =>
      fireEvent.click(within(list).getByRole('option', { name: /Linked post/ }))
    )
    const name = sourceKind === 'story' ? 'Linked story' : 'Linked article'
    expect(
      within(screen.getByRole('button', { name: 'Post properties' })).getByText(`Source: ${name}`)
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Post properties' }))
    const source = screen.getByLabelText('Source') as HTMLSelectElement
    expect(source.value).toBe(sourceKind === 'story' ? 'story:s1' : 'article:a1')
    expect(source.selectedOptions[0].textContent).toBe(name)
  }
)

it.each(['Story', 'Article', 'Post'] as const)(
  'starts each existing or new %s session folded with its own summary',
  async (kind) => {
    const fake = createFakePort({
      stories: [
        makeStory({ ID: 's1', Topic: 'First story', Titles: ['First title', ' '], Tags: ['one'] }),
        makeStory({
          ID: 's2',
          Topic: 'Second story',
          Titles: ['Second title'],
          Tags: ['two', 'three']
        })
      ],
      articles: [
        makeArticle({
          ID: 'a1',
          StoryID: 's1',
          Title: 'First article',
          Subtitle: 'First subtitle'
        }),
        makeArticle({
          ID: 'a2',
          StoryID: 's2',
          Title: 'Second article',
          Subtitle: 'Second subtitle'
        })
      ],
      posts: [
        makePost({ ID: 'p1', Topic: 'First post', StoryID: 's1' }),
        makePost({ ID: 'p2', Topic: 'Second post', ArticleID: 'a2' })
      ]
    })
    renderApp(fake.port)
    await screen.findByRole('listbox', { name: 'Stories' })
    const library = kind === 'Story' ? 'Stories' : `${kind}s`
    if (kind !== 'Story') fireEvent.click(screen.getByRole('button', { name: library }))
    const list = await screen.findByRole('listbox', { name: library })
    await act(async () =>
      fireEvent.click(
        within(list).getByRole('option', { name: new RegExp(`First ${kind.toLowerCase()}`) })
      )
    )
    const toggle = screen.getByRole('button', { name: `${kind} properties` })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    const firstSummary =
      kind === 'Story'
        ? '1 title · 1 tag'
        : kind === 'Article'
          ? 'First subtitle'
          : 'Source: First story'
    expect(within(toggle).getByText(firstSummary)).toBeTruthy()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    await act(async () =>
      fireEvent.click(
        within(list).getByRole('option', { name: new RegExp(`Second ${kind.toLowerCase()}`) })
      )
    )
    const nextToggle = screen.getByRole('button', { name: `${kind} properties` })
    expect(nextToggle.getAttribute('aria-expanded')).toBe('false')
    const nextSummary =
      kind === 'Story'
        ? '1 title · 2 tags'
        : kind === 'Article'
          ? 'Second subtitle'
          : 'Source: Second article'
    expect(within(nextToggle).getByText(nextSummary)).toBeTruthy()

    await act(async () => fireEvent.keyDown(document.body, { key: 'n', ctrlKey: true }))
    expect(
      screen.getByRole('button', { name: `${kind} properties` }).getAttribute('aria-expanded')
    ).toBe('false')
    expect(
      (screen.getByLabelText(kind === 'Article' ? 'Title' : 'Topic') as HTMLInputElement).value
    ).toBe('')
  }
)

it('keeps Post state and schedule visible while folding its source and preserving source rules', async () => {
  const fake = createFakePort({
    stories: [makeStory({ ID: 's1', Topic: 'Source story' })],
    articles: [makeArticle({ ID: 'a1', StoryID: 's1', Title: 'Source article' })]
  })
  renderApp(fake.port)
  await screen.findByRole('listbox', { name: 'Stories' })
  fireEvent.click(screen.getByRole('button', { name: 'Posts' }))
  await act(async () => {
    fireEvent.click(
      within(screen.getByRole('complementary', { name: 'Library' })).getByRole('button', {
        name: /New Post/
      })
    )
  })
  const toggle = screen.getByRole('button', { name: 'Post properties' })
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByRole('combobox', { name: 'Source' })).toBeNull()
  expect(screen.getByRole('combobox', { name: 'State' })).toBeTruthy()
  expect(screen.getByText('Source: No source')).toBeTruthy()

  fireEvent.click(toggle)
  fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'story:s1' } })
  fireEvent.click(toggle)
  expect(screen.getByText('Source: Source story')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('State'), { target: { value: 'scheduled' } })
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(screen.getByLabelText('Scheduled at')).toBeTruthy()
  expect(screen.getByText('Optional')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Scheduled at'), { target: { value: '2030-12-05T10:30' } })
  fireEvent.click(toggle)
  expect((screen.getByLabelText('Source') as HTMLSelectElement).disabled).toBe(true)
  expect(screen.getByText('Locked while the post is scheduled.')).toBeTruthy()

  fireEvent.change(screen.getByLabelText('State'), { target: { value: 'pending' } })
  expect(screen.queryByLabelText('Scheduled at')).toBeNull()
  expect((screen.getByLabelText('Source') as HTMLSelectElement).disabled).toBe(false)
  fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'article:a1' } })
  fireEvent.click(toggle)
  const topic = screen.getByLabelText('Topic') as HTMLInputElement
  fireEvent.change(topic, { target: { value: 'A post' } })
  act(() => topic.focus())
  await screen.findByRole('region', { name: 'Post' }, { timeout: 3000 })
  expect(document.activeElement === topic).toBe(true)
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(fake.createdPosts[0]).toMatchObject({ articleId: 'a1', storyId: null })
  expect(screen.getByText('Source: Source article')).toBeTruthy()

  fireEvent.click(toggle)
  expect((screen.getByLabelText('Source') as HTMLSelectElement).value).toBe('article:a1')
  fireEvent.change(screen.getByLabelText('State'), { target: { value: 'published' } })
  await waitFor(
    () =>
      expect(fake.updatedPosts.at(-1)).toMatchObject({
        State: 'published',
        ArticleID: 'a1',
        ScheduledAt: null
      }),
    { timeout: 3000 }
  )
  expect(toggle.getAttribute('aria-expanded')).toBe('true')
  await screen.findByText('Saved')
})

it('keeps Article identifiers visible and preserves Subtitle and focus across creation', async () => {
  const fake = createFakePort({ stories: [makeStory({ ID: 's1', Topic: 'Source' })] })
  renderApp(fake.port)
  await screen.findByRole('listbox', { name: 'Stories' })
  fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
  await act(async () => {
    fireEvent.click(
      within(screen.getByRole('complementary', { name: 'Library' })).getByRole('button', {
        name: /New Article/
      })
    )
  })
  const toggle = screen.getByRole('button', { name: 'Article properties' })
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByRole('textbox', { name: 'Subtitle' })).toBeNull()
  expect(screen.getByText('No subtitle')).toBeTruthy()
  expect(screen.getByRole('combobox', { name: 'Story' })).toBeTruthy()
  expect(screen.getByRole('textbox', { name: 'Title' })).toBeTruthy()

  fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's1' } })
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'An article' } })
  fireEvent.click(toggle)
  const subtitle = screen.getByLabelText('Subtitle') as HTMLInputElement
  fireEvent.change(subtitle, { target: { value: 'A subtitle draft' } })
  act(() => subtitle.focus())
  subtitle.setSelectionRange(2, 10)
  await screen.findByRole('region', { name: 'Article' }, { timeout: 3000 })
  expect(toggle.getAttribute('aria-expanded')).toBe('true')
  expect(document.activeElement === subtitle).toBe(true)
  expect([subtitle.selectionStart, subtitle.selectionEnd]).toEqual([2, 10])

  fireEvent.click(toggle)
  expect(screen.queryByRole('textbox', { name: 'Subtitle' })).toBeNull()
  expect(screen.getByText('A subtitle draft')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'An updated article' } })
  await waitFor(
    () =>
      expect(fake.updatedArticles.at(-1)).toMatchObject({
        Title: 'An updated article',
        Subtitle: 'A subtitle draft'
      }),
    { timeout: 3000 }
  )
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(toggle)
  expect((screen.getByLabelText('Subtitle') as HTMLInputElement).value).toBe('A subtitle draft')
  await screen.findByText('Saved')
})
