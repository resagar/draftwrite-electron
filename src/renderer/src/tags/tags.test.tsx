import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, jest } from '@jest/globals'
import { makeArticle, makePost, makeStory } from '../data/fake/factories'
import { createFakePort, type FakePort } from '../data/fake/fake-port'
import { renderApp } from '../test/render-app'

const sharedFixture = (): FakePort =>
  createFakePort({
    stories: [makeStory({ ID: 's', Topic: 'Source', Tags: ['shared'] })],
    articles: [
      makeArticle({ ID: 'a', StoryID: 's', Title: 'Article', Tags: ['shared', 'article-only'] })
    ],
    posts: [makePost({ ID: 'p', Topic: 'Post', StoryID: 's', Tags: ['shared', 'post-only'] })]
  })

async function start(fake: FakePort): Promise<void> {
  renderApp(fake.port)
  await screen.findByRole('listbox', { name: 'Stories' })
}
function menu(name: string): void {
  fireEvent.contextMenu(screen.getByRole('button', { name }), { clientX: 100, clientY: 100 })
}
async function settings(name = 'shared'): Promise<HTMLElement> {
  menu(name)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Tag Settings…' }))
  return screen.findByRole('dialog', { name: 'Tag Settings' })
}
async function color(value: string): Promise<void> {
  fireEvent.click(screen.getByRole('combobox', { name: 'Tag color' }))
  fireEvent.click(screen.getByRole('option', { name: value }))
}
async function deletion(): Promise<HTMLElement> {
  menu('shared')
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete tag everywhere…' }))
  const dialog = await screen.findByRole('dialog', { name: 'Delete tag everywhere' })
  await within(dialog).findByText(
    '1 stories, 1 articles, 1 posts affected. Their content will be kept.'
  )
  return dialog
}

describe('tag interactions', () => {
  it('shows a read-only name, saves a global color immediately and preserves it on a fresh mount', async () => {
    const fake = sharedFixture()
    const mounted = renderApp(fake.port)
    await screen.findByRole('listbox', { name: 'Stories' })
    const dialog = await settings()
    expect((within(dialog).getByLabelText('Tag name') as HTMLInputElement).readOnly).toBe(true)
    await color('teal')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await fake.port.listTagMetadata()).toEqual([{ name: 'shared', color: 'teal' }])
    const dot = screen.getByRole('button', { name: 'shared' }).querySelector('.tag-dot')!
    expect(dot.getAttribute('style')).toContain('--ctp-teal')
    expect(screen.getByRole('button', { name: 'Tag shared' }).getAttribute('style')).toContain(
      '--ctp-teal'
    )
    mounted.unmount()
    await start(fake)
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: 'shared' })
          .querySelector('.tag-dot')!
          .getAttribute('style')
      ).toContain('--ctp-teal')
    )
  })

  it('cancels color changes and restores focus; failed saves retain the draft for retry', async () => {
    const fake = sharedFixture()
    await start(fake)
    let dialog = await settings()
    await color('pink')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(await fake.port.listTagMetadata()).toEqual([])
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'shared' }))
    const save = jest.spyOn(fake.port, 'setTagColor').mockRejectedValueOnce(new Error('failed'))
    dialog = await settings()
    await color('violet')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await within(dialog).findByRole('alert')
    expect(within(dialog).getByRole('combobox').textContent).toContain('violet')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('opens the menu by keyboard, moves through it and closes on Escape', async () => {
    await start(sharedFixture())
    const trigger = screen.getByRole('button', { name: 'shared' })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'F10', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Tag Settings…' }))
    fireEvent.keyDown(document.activeElement!, { key: 'End' })
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Delete tag everywhere…' })
    )
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it.each(['Articles', 'Posts'] as const)(
    'edits independent tags in %s and preserves text on autosave',
    async (kind) => {
      const fake = sharedFixture()
      await start(fake)
      fireEvent.click(screen.getByRole('button', { name: kind }))
      const list = await screen.findByRole('listbox', { name: kind })
      fireEvent.click(within(list).getAllByRole('option')[0])
      const subject = kind === 'Articles' ? 'Article' : 'Post'
      fireEvent.click(screen.getByRole('button', { name: `${subject} properties` }))
      const input = screen.getByLabelText('Add a tag')
      fireEvent.change(input, { target: { value: 'new-own' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      await waitFor(
        () => {
          const saved = kind === 'Articles' ? fake.updatedArticles.at(-1) : fake.updatedPosts.at(-1)
          expect(saved?.Tags).toContain('new-own')
        },
        { timeout: 2500 }
      )
      expect((await fake.port.listStories())[0].Tags).toEqual(['shared'])
      expect(
        (kind === 'Articles' ? await fake.port.listArticles() : await fake.port.listPosts())[0].Text
      ).not.toBe('')
      expect(screen.getByRole('button', { name: 'new-own' })).toBeTruthy()
    }
  )

  it.each(['Articles', 'Posts'] as const)(
    'creates %s with its own tags and no copied source tags',
    async (kind) => {
      const fake = sharedFixture()
      await start(fake)
      fireEvent.click(screen.getByRole('button', { name: kind }))
      const sidebar = screen.getByRole('complementary', { name: 'Library' })
      fireEvent.click(
        within(sidebar).getByRole('button', {
          name: kind === 'Articles' ? /New Article/ : /New Post/
        })
      )
      fireEvent.click(
        screen.getByRole('button', {
          name: kind === 'Articles' ? 'Article properties' : 'Post properties'
        })
      )
      const tags = screen.getByLabelText('Add a tag')
      fireEvent.change(tags, { target: { value: 'only-own' } })
      fireEvent.keyDown(tags, { key: 'Enter' })
      if (kind === 'Articles')
        fireEvent.change(screen.getByLabelText('Story'), { target: { value: 's' } })
      fireEvent.change(screen.getByLabelText(kind === 'Articles' ? 'Title' : 'Topic'), {
        target: { value: 'New piece' }
      })
      await waitFor(
        () => {
          const created =
            kind === 'Articles' ? fake.createdArticles.at(-1) : fake.createdPosts.at(-1)
          expect(created?.tags).toEqual(['only-own'])
        },
        { timeout: 2500 }
      )
      expect((await fake.port.listStories())[0].Tags).toEqual(['shared'])
    }
  )

  it('filters Articles by own or source tags and Posts only by their own tags', async () => {
    const fake = sharedFixture()
    await start(fake)
    fireEvent.click(screen.getByRole('button', { name: 'article-only' }))
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    expect(await screen.findByRole('listbox', { name: 'Articles' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Posts' }))
    expect(await screen.findByText('No posts with this tag')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'post-only' }))
    expect(await screen.findByRole('listbox', { name: 'Posts' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'post-only' }))
    fireEvent.click(screen.getByRole('button', { name: 'shared' }))
    fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
    expect(await screen.findByRole('listbox', { name: 'Articles' })).toBeTruthy()
  })

  it('confirms global impact, cancels without writes, and deletes assignments and metadata on confirmation', async () => {
    const fake = sharedFixture()
    await fake.port.setTagColor('shared', 'teal')
    await start(fake)
    const remove = jest.spyOn(fake.port, 'deleteTagEverywhere')
    let dialog = await deletion()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(remove).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'shared' }))
    dialog = await deletion()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete tag everywhere' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.queryByRole('button', { name: 'shared' })).toBeNull()
    expect(await fake.port.tagImpact('shared')).toEqual({ stories: 0, articles: 0, posts: 0 })
    expect(await fake.port.listTagMetadata()).toEqual([])
    expect(screen.queryByText('No stories with this tag')).toBeNull()
  })

  it('preserves an incomplete draft and prevents its later autosave from restoring a globally deleted tag', async () => {
    const fake = sharedFixture()
    await start(fake)
    fireEvent.click(within(screen.getByRole('listbox', { name: 'Stories' })).getByRole('option'))
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: '' } })
    const dialog = await deletion()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete tag everywhere' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect((screen.getByLabelText('Topic') as HTMLInputElement).value).toBe('')
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'Edited source' } })
    await waitFor(() => expect(fake.updatedStories.at(-1)?.Topic).toBe('Edited source'), {
      timeout: 2500
    })
    expect(fake.updatedStories.at(-1)?.Tags).toEqual([])
    expect(fake.updatedStories.at(-1)?.Text).toBe('The story text.')
  })

  it('waits for an in-flight autosave before deletion and removes the tag from subsequent edits', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const fake = createFakePort({
      stories: [makeStory({ Tags: ['shared'] })],
      updateStoryGate: gate
    })
    await start(fake)
    fireEvent.click(within(screen.getByRole('listbox', { name: 'Stories' })).getByRole('option'))
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'During save' } })
    await waitFor(() => expect(fake.calls.updateStory).toBe(1), { timeout: 2500 })
    menu('shared')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete tag everywhere…' }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText(/1 stories, 0 articles, 0 posts/)
    const remove = jest.spyOn(fake.port, 'deleteTagEverywhere')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete tag everywhere' }))
    expect(remove).not.toHaveBeenCalled()
    await act(async () => {
      release()
      await gate
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'After delete' } })
    await waitFor(() => expect(fake.updatedStories.at(-1)?.Topic).toBe('After delete'), {
      timeout: 2500
    })
    expect(fake.updatedStories.at(-1)?.Tags).toEqual([])
  })

  it.each(['Stories', 'Articles', 'Posts'] as const)(
    'finishes a queued %s autosave after global deletion without restoring the tag',
    async (kind) => {
      const fake = sharedFixture()
      let release!: () => void
      const gate = new Promise<void>((resolve) => {
        release = resolve
      })
      const remove = fake.port.deleteTagEverywhere.bind(fake.port)
      const deleting = jest
        .spyOn(fake.port, 'deleteTagEverywhere')
        .mockImplementation(async (name) => {
          await gate
          await remove(name)
        })
      await start(fake)
      if (kind !== 'Stories') fireEvent.click(screen.getByRole('button', { name: kind }))
      const list = await screen.findByRole('listbox', { name: kind })
      fireEvent.click(within(list).getAllByRole('option')[0])
      const label = kind === 'Articles' ? 'Title' : 'Topic'
      fireEvent.change(screen.getByLabelText(label), { target: { value: 'Unsaved change' } })
      const dialog = await deletion()
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete tag everywhere' }))
      await waitFor(() => expect(deleting).toHaveBeenCalledTimes(1))
      // Let the debounce enqueue the pending draft while deletion owns the queue.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 800))
      })
      await act(async () => {
        release()
        await gate
      })
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      await screen.findByText('Saved')
      const saved =
        kind === 'Stories'
          ? fake.updatedStories.at(-1)
          : kind === 'Articles'
            ? fake.updatedArticles.at(-1)
            : fake.updatedPosts.at(-1)
      expect(saved?.Tags).not.toContain('shared')
      expect(saved?.Text).not.toBe('')
      expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('Unsaved change')
    }
  )

  it('keeps assignments and the draft intact after failed global deletion', async () => {
    const fake = sharedFixture()
    await start(fake)
    jest.spyOn(fake.port, 'deleteTagEverywhere').mockRejectedValueOnce(new Error('failed'))
    const dialog = await deletion()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete tag everywhere' }))
    await within(dialog).findByRole('alert')
    expect((await fake.port.listStories())[0].Tags).toEqual(['shared'])
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'shared' })).toBeTruthy()
  })
})
