import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from '@jest/globals'
import { makeArticle, makePost, makeStory } from '../data/fake/factories'
import { createFakePort } from '../data/fake/fake-port'
import { renderApp } from '../test/render-app'

function fixture(): ReturnType<typeof createFakePort> {
  return createFakePort({
    stories: [
      makeStory({
        ID: 's1',
        Topic: 'Calm software',
        Tags: ['tech'],
        Text: 'About quiet interfaces',
        UpdatedAt: '2024-10-10T10:00:00'
      }),
      makeStory({
        ID: 's2',
        Topic: 'Night song',
        Text: 'A song',
        UpdatedAt: '2024-10-09T10:00:00'
      })
    ],
    articles: [
      makeArticle({
        ID: 'a1',
        StoryID: 's1',
        Title: 'Quiet tools',
        UpdatedAt: '2024-10-11T10:00:00'
      })
    ],
    posts: [
      makePost({
        ID: 'p1',
        Topic: 'Launch note',
        State: 'scheduled',
        UpdatedAt: '2024-10-12T10:00:00'
      })
    ]
  })
}

async function openWithKeyboard(): Promise<HTMLElement> {
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  return screen.findByRole('combobox', { name: 'Search stories, articles and posts' })
}

describe('quick switcher', () => {
  it('opens with Ctrl/Cmd+K and groups every collection', async () => {
    renderApp(fixture().port)
    await screen.findByRole('option', { name: /Calm software/ })

    const combobox = await openWithKeyboard()
    const dialog = screen.getByRole('dialog', { name: 'Quick switcher' })

    expect(document.activeElement).toBe(combobox)
    expect(within(dialog).getByRole('group', { name: 'Stories' })).toBeTruthy()
    expect(within(dialog).getByRole('group', { name: 'Articles' })).toBeTruthy()
    expect(within(dialog).getByRole('group', { name: 'Posts' })).toBeTruthy()

    expect(
      within(dialog)
        .getAllByRole('option')
        .map((option) => option.id)
    ).toEqual([
      'quick-switcher-option-story-s1',
      'quick-switcher-option-story-s2',
      'quick-switcher-option-article-a1',
      'quick-switcher-option-post-p1'
    ])
  })

  it('opens with the keyboard and restores focus when closed', async () => {
    renderApp(fixture().port)
    await screen.findByRole('option', { name: /Calm software/ })

    const trigger = screen.getByRole('button', { name: 'Stories' })
    trigger.focus()

    const combobox = await openWithKeyboard()
    expect(document.activeElement).toBe(combobox)

    fireEvent.keyDown(combobox, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'Quick switcher' })).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('moves the active option with the arrows and opens it with Enter', async () => {
    renderApp(fixture().port)
    await screen.findByRole('option', { name: /Calm software/ })

    const combobox = await openWithKeyboard()
    fireEvent.keyDown(combobox, { key: 'ArrowDown' })
    fireEvent.keyDown(combobox, { key: 'ArrowDown' })
    fireEvent.keyDown(combobox, { key: 'Enter' })

    expect(await screen.findByRole('region', { name: 'Article editor' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Articles' }).getAttribute('aria-current')).toBe(
      'page'
    )
  })

  it('filters by identifier and switches to the matching library', async () => {
    renderApp(fixture().port)
    await screen.findByRole('option', { name: /Calm software/ })

    const combobox = await openWithKeyboard()
    fireEvent.change(combobox, { target: { value: 'launch' } })

    const dialog = screen.getByRole('dialog', { name: 'Quick switcher' })
    expect(within(dialog).getAllByRole('option')).toHaveLength(1)

    fireEvent.keyDown(combobox, { key: 'Enter' })

    expect(await screen.findByRole('region', { name: 'Post editor' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Posts' }).getAttribute('aria-current')).toBe('page')
  })

  it('explains when nothing matches', async () => {
    renderApp(fixture().port)
    await screen.findByRole('option', { name: /Calm software/ })

    const combobox = await openWithKeyboard()
    fireEvent.change(combobox, { target: { value: 'zzz' } })

    expect(screen.getByText('No matches')).toBeTruthy()
    expect(screen.getByText('Nothing matches “zzz”.')).toBeTruthy()
  })

  it('keeps the palette open and ignores global shortcuts while it is open', async () => {
    renderApp(fixture().port)
    await screen.findByRole('option', { name: /Calm software/ })

    await openWithKeyboard()
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })

    expect(screen.getByRole('dialog', { name: 'Quick switcher' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Story editor' })).toBeNull()
  })

  it('shows a failed collection and retries it from the palette', async () => {
    const fake = createFakePort({
      stories: [makeStory({ ID: 's1', Topic: 'Calm software' })],
      listStoriesFailures: 1
    })

    renderApp(fake.port)
    await screen.findByText('Stories could not be loaded')

    await openWithKeyboard()
    const dialog = screen.getByRole('dialog', { name: 'Quick switcher' })

    expect(within(dialog).getByText('Stories could not be loaded.')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retry' }))

    expect(await within(dialog).findByRole('option', { name: /Calm software/ })).toBeTruthy()
    expect(fake.calls.listStories).toBe(2)
  })

  it('asks before discarding an unsaved draft and can cancel the move', async () => {
    renderApp(fixture().port)
    await screen.findByRole('option', { name: /Calm software/ })

    fireEvent.click(screen.getByRole('button', { name: /New Story/ }))
    fireEvent.click(screen.getByRole('button', { name: /Story properties/ }))
    const tagInput = screen.getByLabelText('Add a tag')
    fireEvent.change(tagInput, { target: { value: 'draft' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    const combobox = await openWithKeyboard()
    fireEvent.change(combobox, { target: { value: 'Calm' } })
    fireEvent.keyDown(combobox, { key: 'Enter' })

    expect(await screen.findByRole('heading', { name: 'Leave without saving?' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Leave without saving?' })).toBeNull()
    )
    expect(screen.getByRole('region', { name: 'Story editor' })).toBeTruthy()
    expect(document.getElementById('story-topic')).toBeTruthy()
  })
})
