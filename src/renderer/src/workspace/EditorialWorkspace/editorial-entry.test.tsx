import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { expect, it } from '@jest/globals'
import type { EditorialWorkspace, PieceKind, Writing } from '../../../../shared/editorial'
import { makeArticle, makePost, makeStory } from '../../data/fake/factories'
import { createFakePort } from '../../data/fake/fake-port'
import { renderApp } from '../../test/render-app'

function fixture(kind: PieceKind, available = true): ReturnType<typeof createFakePort> {
  const content: Writing =
    kind === 'article'
      ? { kind, title: 'Lunar article', subtitle: '', target: '', text: 'Article text' }
      : { kind, topic: 'Launch post', text: 'Post text' }
  const workspace: EditorialWorkspace = {
    kind,
    pieceId: kind === 'article' ? 'a1' : 'p1',
    revision: 0,
    primaryId: 'main',
    variants: [
      {
        id: 'main',
        name: 'Main',
        number: '1.0.0',
        archived: false,
        headId: 'v1',
        baseId: null,
        content,
        initialContent: content,
        notes: [],
        pendingIntegrations: []
      }
    ],
    versions: [
      {
        id: 'v1',
        variantId: 'main',
        number: '1.0.0',
        description: 'Initial version',
        createdAt: '2026-11-04T00:00:00Z',
        parentId: null,
        integratedFrom: [],
        content,
        notes: []
      }
    ],
    publications: [],
    origin: null,
    conversions: []
  }
  return createFakePort({
    stories: [makeStory({ ID: 's1' })],
    articles: [makeArticle({ ID: 'a1', StoryID: 's1', Title: 'Lunar article' })],
    posts: [makePost({ ID: 'p1', Topic: 'Launch post' })],
    editorial: available ? async () => ({ workspace }) : undefined
  })
}

async function openPiece(kind: PieceKind): Promise<HTMLElement> {
  const library = kind === 'article' ? 'Articles' : 'Posts'
  const title = kind === 'article' ? 'Lunar article' : 'Launch post'
  fireEvent.click(screen.getByRole('button', { name: library }))
  fireEvent.click(await screen.findByRole('option', { name: new RegExp(title) }))
  return screen.getByRole('region', { name: kind === 'article' ? 'Article' : 'Post' })
}

it.each(['article', 'post'] as const)(
  'opens %s versions from the header without an informational row',
  async (kind) => {
    renderApp(fixture(kind).port)
    const region = await openPiece(kind)
    const mode = within(region).getByRole('group', { name: 'View mode' })
    const actions = mode.parentElement!
    const button = within(actions).getByRole('button', { name: 'Versions and review' })
    expect(button.textContent).toBe('')
    expect(button.getAttribute('title')).toBe('Versions and review')
    expect(
      within(actions)
        .getAllByRole('button')
        .map((item) => item.getAttribute('aria-label') ?? item.textContent)
    ).toEqual(['Edit', 'Split', 'Preview', 'Versions and review', `Delete ${kind}`])
    expect(screen.queryByText('Autosaved draft · manual versions')).toBeNull()
    fireEvent.click(button)
    expect(await screen.findByRole('button', { name: 'Save version' })).toBeTruthy()
    expect(within(region).getByRole('group', { name: 'View mode' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Versions and review' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Back to writing' }))
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Editorial workspace' })).toBeNull()
    )
    expect(within(region).getByRole('button', { name: 'Versions and review' })).toBeTruthy()
  }
)

it.each(['article', 'post'] as const)(
  'hides %s versions when the capability is unavailable',
  async (kind) => {
    renderApp(fixture(kind, false).port)
    await openPiece(kind)
    expect(screen.queryByRole('button', { name: 'Versions and review' })).toBeNull()
  }
)

it.each(['article', 'post'] as const)(
  'keeps %s versions disabled until the draft is saved',
  async (kind) => {
    renderApp(fixture(kind).port)
    const region = await openPiece(kind)
    const button = within(region).getByRole('button', {
      name: 'Versions and review'
    }) as HTMLButtonElement
    const title = within(region).getByRole('textbox', {
      name: kind === 'article' ? 'Title' : 'Topic'
    })
    expect(button.disabled).toBe(false)
    fireEvent.change(title, { target: { value: 'Updated writing' } })
    expect(button.disabled).toBe(true)
    await waitFor(() => expect(button.disabled).toBe(false), { timeout: 2000 })
    fireEvent.change(title, { target: { value: '' } })
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(screen.queryByRole('region', { name: 'Editorial workspace' })).toBeNull()
  }
)
