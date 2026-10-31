import { beforeEach, expect, it } from '@jest/globals'
import { act, fireEvent, screen } from '@testing-library/react'
import { EditorView } from '@codemirror/view'
import { defaultPreferences } from './preferences'
import { renderApp } from '../test/render-app'
import { createFakePort } from '../data/fake/fake-port'
import { makeStory } from '../data/fake/factories'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(
    'draftwrite.typography',
    JSON.stringify({
      ...defaultPreferences,
      editor: { ...defaultPreferences.editor, vimMode: true }
    })
  )
})

async function ex(command: string): Promise<void> {
  const content = document.querySelector('.cm-content')!
  act(() => {
    ;(content as HTMLElement).focus()
    fireEvent.keyDown(content, { key: ':', code: 'Semicolon', shiftKey: true })
  })
  const input = document.querySelector('.cm-vim-panel input') as HTMLInputElement
  expect(input).toBeTruthy()
  await act(async () => {
    fireEvent.input(input, { target: { value: command } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 })
  })
}

async function openStory(
  failures = 0,
  gate?: Promise<void>
): Promise<ReturnType<typeof createFakePort>> {
  const fake = createFakePort({
    stories: [makeStory()],
    updateStoryFailures: failures,
    updateStoryGate: gate
  })
  renderApp(fake.port)
  const option = await screen.findByRole('option', { name: /A topic/ })
  await act(async () => {
    fireEvent.click(option)
  })
  await screen.findByLabelText('Vim mode: Normal')
  const view = EditorView.findFromDOM(document.querySelector('.cm-editor') as HTMLElement)!
  act(() =>
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: 'Changed text' } })
  )
  return fake
}

it('saves the current document with :w through the existing manual save flow', async () => {
  const fake = await openStory()
  await ex('w')
  expect(fake.calls.updateStory).toBe(1)
  expect(fake.updatedStories).toHaveLength(1)
  expect(fake.updatedStories[0].Text).toBe('Changed text')
  expect(screen.getByText('Saved')).toBeTruthy()
})

it('shows the existing save error and keeps the text on :w failure', async () => {
  const fake = await openStory(1)
  await ex('w')
  expect(screen.getByText('Not saved')).toBeTruthy()
  expect(fake.calls.updateStory).toBe(1)
  expect(document.querySelector('.cm-content')!.textContent).toBe('Changed text')
})

it.each(['q', 'q!', 'wq'])(
  'rejects :%s visibly without saving or closing an incomplete draft',
  async (command) => {
    const fake = createFakePort()
    renderApp(fake.port)
    await screen.findByText('No stories yet')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'New Story' })))
    await screen.findByLabelText('Vim mode: Normal')
    const view = EditorView.findFromDOM(document.querySelector('.cm-editor') as HTMLElement)!
    act(() => view.dispatch({ changes: { from: 0, insert: 'Keep this draft' } }))
    await ex(command)
    expect(
      await screen.findByText('Vim close commands are not available. Use the document controls.')
    ).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Story editor' })).toBeTruthy()
    expect(view.state.doc.toString()).toBe('Keep this draft')
    expect(fake.calls.createStory).toBe(0)
  }
)

it('keeps Saving visible until :w completes and resolves the active document after navigation', async () => {
  let finish!: () => void
  const gate = new Promise<void>((resolve) => {
    finish = resolve
  })
  const fake = await openStory(0, gate)
  await ex('w')
  expect(fake.calls.updateStory).toBe(1)
  expect(screen.getByText('Saving')).toBeTruthy()
  expect(screen.queryByText('Saved')).toBeNull()
  await act(async () => {
    finish()
    await gate
  })
  expect(screen.getByText('Saved')).toBeTruthy()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: /New Story/ })))
  await screen.findByLabelText('Vim mode: Normal')
  const view = EditorView.findFromDOM(document.querySelector('.cm-editor') as HTMLElement)!
  act(() => view.dispatch({ changes: { from: 0, insert: 'Incomplete next document' } }))
  await ex('w')
  expect(screen.getByText('Not saved yet')).toBeTruthy()
  expect(fake.calls.updateStory).toBe(1)
  expect(fake.calls.createStory).toBe(0)
})

it('rejects :wq without manually saving a valid pending document', async () => {
  const fake = await openStory()
  await ex('wq')
  expect(fake.calls.updateStory).toBe(0)
  expect(screen.getByText('Unsaved')).toBeTruthy()
  expect(
    screen.getByText('Vim close commands are not available. Use the document controls.')
  ).toBeTruthy()
  expect(screen.getByRole('region', { name: 'Story editor' })).toBeTruthy()
})
