import { beforeEach, expect, it, jest } from '@jest/globals'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { EditorView } from '@codemirror/view'
import { createFakePort } from '../data/fake/fake-port'
import { renderApp } from '../test/render-app'

beforeEach(() => localStorage.clear())

it('applies independent typography immediately, restores one context and persists on remount', async () => {
  const fake = createFakePort()
  const app = renderApp(fake.port)
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
  expect(await screen.findByRole('heading', { name: 'Typography' })).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Editor font size (px)'), { target: { value: '24' } })
  fireEvent.change(screen.getByLabelText('Preview font size (px)'), { target: { value: '20' } })
  fireEvent.change(screen.getByLabelText('Interface scale (%)'), { target: { value: '150' } })
  fireEvent.change(screen.getByLabelText('Editor font'), { target: { value: 'Monaspace Neon' } })
  fireEvent.click(screen.getByRole('button', { name: 'Restore preview defaults' }))
  expect((screen.getByLabelText('Preview font size (px)') as HTMLInputElement).value).toBe('16')
  expect((screen.getByLabelText('Editor font size (px)') as HTMLInputElement).value).toBe('24')
  app.unmount()
  renderApp(fake.port)
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
  await waitFor(() => expect(screen.queryByText('Loading system fonts…')).toBeNull())
  expect((screen.getByLabelText('Editor font') as HTMLSelectElement).value).toBe('Monaspace Neon')
  expect((screen.getByLabelText('Editor font size (px)') as HTMLInputElement).value).toBe('24')
  expect((screen.getByLabelText('Interface scale (%)') as HTMLInputElement).value).toBe('150')
})

it('keeps an incomplete draft and its editor selection while visiting settings', async () => {
  const fake = createFakePort()
  renderApp(fake.port)
  await screen.findByText('No stories yet')
  fireEvent.click(screen.getByRole('button', { name: 'New Story' }))
  const editor = document.querySelector('.cm-editor') as HTMLElement
  const view = EditorView.findFromDOM(editor)!
  act(() =>
    view.dispatch({ changes: { from: 0, insert: 'An unfinished draft' }, selection: { anchor: 5 } })
  )
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
  await waitFor(() => expect(screen.queryByText('Loading system fonts…')).toBeNull())
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Back to writing' }))
  expect(document.querySelector('.cm-editor')).toBe(editor)
  expect(view.state.doc.toString()).toBe('An unfinished draft')
  expect(view.state.selection.main.head).toBe(5)
  expect(fake.calls.createStory).toBe(0)
})

it('searches system fonts and recovers a missing family without losing the preference', async () => {
  const fake = createFakePort({ fontFamilies: ['inter', 'Local Serif', 'Local Serif'] })
  renderApp(fake.port)
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
  await waitFor(() => expect(screen.queryByText('Loading system fonts…')).toBeNull())
  const select = screen.getByLabelText('Preview font')
  expect(within(select).getAllByRole('option', { name: 'Inter' })).toHaveLength(1)
  expect(within(select).getAllByRole('option', { name: 'Local Serif' })).toHaveLength(1)
  fireEvent.change(select, { target: { value: 'Local Serif' } })
  fireEvent.change(screen.getByLabelText('Search preview fonts'), {
    target: { value: 'monaspace' }
  })
  expect(within(select).queryByRole('option', { name: 'Inter' })).toBeNull()
  fake.port.listFontFamilies = async () => []
  fireEvent.click(screen.getByRole('button', { name: 'Back to writing' }))
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
  expect(await screen.findByText(/Unavailable font: Local Serif/)).toBeTruthy()
  expect((screen.getByLabelText('Preview font') as HTMLSelectElement).value).toBe('Local Serif')
  fake.port.listFontFamilies = async () => ['Local Serif']
  fireEvent.click(screen.getByRole('button', { name: 'Back to writing' }))
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
  await waitFor(() => expect(screen.queryByText('Loading system fonts…')).toBeNull())
  expect(screen.queryByText(/Unavailable font:/)).toBeNull()
  expect((screen.getByLabelText('Preview font') as HTMLSelectElement).value).toBe('Local Serif')
})

it('keeps bundled fonts usable after catalog failure and reports failed persistence', async () => {
  const fake = createFakePort()
  fake.port.listFontFamilies = async () => {
    throw new Error('unavailable')
  }
  renderApp(fake.port)
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
  expect(await screen.findByText(/System fonts could not be loaded/)).toBeTruthy()
  const write = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('full')
  })
  fireEvent.change(screen.getByLabelText('Editor font'), { target: { value: 'Monaspace Argon' } })
  expect(screen.getByText(/could not be saved/)).toBeTruthy()
  expect((screen.getByLabelText('Editor font') as HTMLSelectElement).value).toBe('Monaspace Argon')
  write.mockRestore()
  fireEvent.change(screen.getByLabelText('Editor font size (px)'), { target: { value: '22' } })
  expect(screen.queryByText(/could not be saved/)).toBeNull()
})

it('allows typing an exact size through an intermediate value outside the range', async () => {
  renderApp(createFakePort().port)
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
  await waitFor(() => expect(screen.queryByText('Loading system fonts…')).toBeNull())
  const size = screen.getByLabelText('Editor font size (px)') as HTMLInputElement
  fireEvent.change(size, { target: { value: '2' } })
  expect(size.value).toBe('2')
  fireEvent.change(size, { target: { value: '24' } })
  fireEvent.blur(size)
  expect(size.value).toBe('24')
  fireEvent.change(size, { target: { value: '99' } })
  fireEvent.blur(size)
  expect(size.value).toBe('24')
})
