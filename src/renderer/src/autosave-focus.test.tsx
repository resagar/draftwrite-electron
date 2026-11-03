import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { expect, it } from '@jest/globals'
import { createFakePort, type FakePort } from './data/fake/fake-port'
import { makeStory } from './data/fake/factories'
import { renderApp } from './test/render-app'
import { createDeferred } from './test/deferred'

type Kind = 'Story' | 'Article' | 'Post'

async function startCreation(kind: Kind, fake: FakePort): Promise<HTMLInputElement> {
  renderApp(fake.port)
  await screen.findByRole('listbox', { name: 'Stories' })
  if (kind !== 'Story') {
    fireEvent.click(screen.getByRole('button', { name: kind === 'Article' ? 'Articles' : 'Posts' }))
  }
  await act(async () => {
    fireEvent.click(
      within(screen.getByRole('complementary', { name: 'Library' })).getByRole('button', {
        name: new RegExp(`New ${kind}`)
      })
    )
  })
  if (kind === 'Article') {
    fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's1' } })
  }
  return screen.getByLabelText(kind === 'Article' ? 'Title' : 'Topic') as HTMLInputElement
}

function lastSavedText(kind: Kind, fake: FakePort): string | undefined {
  return kind === 'Story'
    ? fake.updatedStories.at(-1)?.Topic
    : kind === 'Article'
      ? fake.updatedArticles.at(-1)?.Title
      : fake.updatedPosts.at(-1)?.Topic
}

it('locks the Article Story once creation starts while allowing newer title edits', async () => {
  const gate = createDeferred()
  const fake = createFakePort({
    stories: [
      makeStory({ ID: 's1', Topic: 'Source' }),
      makeStory({ ID: 's2', Topic: 'Other source' })
    ],
    createArticleGate: gate.promise
  })
  const title = await startCreation('Article', fake)
  fireEvent.change(title, { target: { value: 'Original title' } })
  await waitFor(() => expect(fake.calls.createArticle).toBe(1), { timeout: 3000 })
  const story = screen.getByLabelText('Story') as HTMLSelectElement
  expect(story.disabled).toBe(true)
  fireEvent.change(title, { target: { value: 'Newer title' } })
  expect(story.disabled).toBe(true)
  fireEvent.change(story, { target: { value: 's2' } })
  await act(async () => gate.resolve())
  await waitFor(() => expect(fake.updatedArticles.at(-1)?.Title).toBe('Newer title'), {
    timeout: 3000
  })
  expect(fake.updatedArticles.at(-1)?.StoryID).toBe('s1')
  expect((screen.getByLabelText('Story') as HTMLSelectElement).value).toBe('s1')
  await screen.findByText('Saved')
})

it.each(['published', 'scheduled'] as const)(
  'persists a Post %s state chosen before its first autosave',
  async (state) => {
    const fake = createFakePort({ stories: [makeStory({ ID: 's1', Topic: 'Source' })] })
    const topic = await startCreation('Post', fake)
    fireEvent.change(topic, { target: { value: 'Published post' } })
    fireEvent.change(screen.getByLabelText('State'), { target: { value: state } })
    if (state === 'scheduled') {
      fireEvent.change(screen.getByLabelText('Scheduled at'), {
        target: { value: '2030-12-05T10:30' }
      })
    }
    await waitFor(() => expect(fake.updatedPosts.at(-1)?.State).toBe(state), { timeout: 3000 })
    expect((screen.getByLabelText('State') as HTMLSelectElement).value).toBe(state)
    expect((await fake.port.listPosts())[0]).toMatchObject({
      State: state,
      ScheduledAt: state === 'scheduled' ? '2030-12-05T10:30' : null
    })
    await screen.findByText('Saved')
  }
)

it('unlocks the Article Story after a failed creation and retries with the chosen Story', async () => {
  const fake = createFakePort({
    stories: [
      makeStory({ ID: 's1', Topic: 'Source' }),
      makeStory({ ID: 's2', Topic: 'Other source' })
    ],
    createArticleFailures: 1
  })
  const title = await startCreation('Article', fake)
  fireEvent.change(title, { target: { value: 'Recoverable article' } })
  await screen.findByRole('alert', {}, { timeout: 3000 })
  expect((screen.getByLabelText('Story') as HTMLSelectElement).disabled).toBe(false)
  fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's2' } })
  act(() => title.focus())
  fireEvent.keyDown(document.body, { key: 's', ctrlKey: true })
  await screen.findByRole('region', { name: 'Article' }, { timeout: 3000 })
  expect(fake.createdArticles).toEqual([
    { storyId: 's2', title: 'Recoverable article', subtitle: '', target: '', text: '' }
  ])
  expect(document.activeElement === title).toBe(true)
  await screen.findByText('Saved')
})

it('keeps pending edits when the selected Story is selected again', async () => {
  const fake = createFakePort({ stories: [makeStory({ ID: 's1', Topic: 'Source' })] })
  renderApp(fake.port)
  const option = await screen.findByRole('option', { name: /Source/ })
  await act(async () => fireEvent.click(option))
  fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'Edited source' } })
  fireEvent.click(option)
  expect((screen.getByLabelText('Topic') as HTMLInputElement).value).toBe('Edited source')
  await waitFor(() => expect(fake.updatedStories.at(-1)?.Topic).toBe('Edited source'), {
    timeout: 3000
  })
  await screen.findByText('Saved')
})

it('keeps an incomplete Story draft protected when an older creation finishes', async () => {
  const gate = createDeferred()
  const fake = createFakePort({
    stories: [makeStory({ ID: 's1', Topic: 'Source' })],
    createStoryGate: gate.promise
  })
  const input = await startCreation('Story', fake)
  fireEvent.click(screen.getByRole('button', { name: 'Add title' }))
  fireEvent.change(screen.getByLabelText('Title 1'), { target: { value: 'Keep this draft' } })
  fireEvent.change(input, { target: { value: 'Original topic' } })
  await waitFor(() => expect(fake.calls.createStory).toBe(1), { timeout: 3000 })

  fireEvent.change(input, { target: { value: '' } })
  await act(async () => gate.resolve())
  expect((screen.getByLabelText('Topic') as HTMLInputElement).value).toBe('')
  expect(screen.queryByText('Saved')).toBeNull()

  fireEvent.keyDown(document.body, { key: 'n', ctrlKey: true })
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect((screen.getByLabelText('Title 1') as HTMLInputElement).value).toBe('Keep this draft')
})

it.each<Kind>(['Story', 'Article', 'Post'])(
  'keeps a new %s session isolated from the previous creation response',
  async (kind) => {
    const gate = createDeferred()
    const fake = createFakePort({
      stories: [makeStory({ ID: 's1', Topic: 'Source' })],
      createStoryGate: gate.promise,
      createArticleGate: gate.promise,
      createPostGate: gate.promise
    })
    const input = await startCreation(kind, fake)
    fireEvent.change(input, { target: { value: 'First session' } })
    await waitFor(
      () =>
        expect(fake.calls.createStory + fake.calls.createArticle + fake.calls.createPost).toBe(1),
      { timeout: 3000 }
    )
    fireEvent.keyDown(document.body, { key: 'n', ctrlKey: true })
    const nextInput = screen.getByLabelText(
      kind === 'Article' ? 'Title' : 'Topic'
    ) as HTMLInputElement
    expect(nextInput.value).toBe('')
    act(() => nextInput.focus())
    await act(async () => gate.resolve())
    expect(nextInput.value).toBe('')
    expect(document.activeElement === nextInput).toBe(true)

    if (kind === 'Article') {
      fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's1' } })
    }
    fireEvent.change(nextInput, { target: { value: 'Second session' } })
    await screen.findByRole('region', { name: kind }, { timeout: 3000 })
    expect(
      (screen.getByLabelText(kind === 'Article' ? 'Title' : 'Topic') as HTMLInputElement).value
    ).toBe('Second session')
    expect(fake.calls.createStory + fake.calls.createArticle + fake.calls.createPost).toBe(2)
  }
)

it.each<Kind>(['Story', 'Article', 'Post'])(
  'keeps the %s field focused and selected across creation and subsequent saves',
  async (kind) => {
    const fake = createFakePort({ stories: [makeStory({ ID: 's1', Topic: 'Source' })] })
    const input = await startCreation(kind, fake)
    act(() => input.focus())
    fireEvent.change(input, { target: { value: 'A thoughtful topic' } })
    input.setSelectionRange(2, 12)

    await screen.findByRole('region', { name: kind }, { timeout: 3000 })

    expect(
      screen.getByLabelText(kind === 'Article' ? 'Title' : 'Topic') === document.activeElement
    ).toBe(true)
    expect(input.selectionStart).toBe(2)
    expect(input.selectionEnd).toBe(12)

    fireEvent.change(input, { target: { value: 'A clear topic' } })
    await waitFor(() => expect(lastSavedText(kind, fake)).toBe('A clear topic'), {
      timeout: 3000
    })
    expect(
      screen.getByLabelText(kind === 'Article' ? 'Title' : 'Topic') === document.activeElement
    ).toBe(true)
    expect(fake.calls.createStory + fake.calls.createArticle + fake.calls.createPost).toBe(1)
    await screen.findByText('Saved')
  }
)

it.each<Kind>(['Story', 'Article', 'Post'])(
  'keeps newer %s edits and chosen focus while creation is in flight',
  async (kind) => {
    const gate = createDeferred()
    const fake = createFakePort({
      stories: [makeStory({ ID: 's1', Topic: 'Source' })],
      createStoryGate: gate.promise,
      createArticleGate: gate.promise,
      createPostGate: gate.promise
    })
    const input = await startCreation(kind, fake)
    fireEvent.change(input, { target: { value: 'First version' } })
    await waitFor(
      () =>
        expect(fake.calls.createStory + fake.calls.createArticle + fake.calls.createPost).toBe(1),
      { timeout: 3000 }
    )

    fireEvent.change(input, { target: { value: 'Newer version' } })
    // Let the next autosave queue behind the unresolved creation.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 750))
    })
    const chosen = screen.getByRole('button', { name: 'Settings' })
    act(() => chosen.focus())
    await act(async () => gate.resolve())

    await waitFor(() => expect(lastSavedText(kind, fake)).toBe('Newer version'), { timeout: 3000 })
    expect(
      (screen.getByLabelText(kind === 'Article' ? 'Title' : 'Topic') as HTMLInputElement).value
    ).toBe('Newer version')
    expect(document.activeElement === chosen).toBe(true)
    expect(fake.calls.createStory + fake.calls.createArticle + fake.calls.createPost).toBe(1)

    fireEvent.change(input, { target: { value: 'Latest version' } })
    await waitFor(() => expect(lastSavedText(kind, fake)).toBe('Latest version'), { timeout: 3000 })
    await screen.findByText('Saved')
  }
)
