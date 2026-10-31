import { beforeEach, expect, it, jest } from '@jest/globals'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { EditorView } from '@codemirror/view'
import { createFakePort } from '../data/fake/fake-port'
import type { DataPort } from '../data/port'
import { renderApp } from '../test/render-app'
import { renderSettings } from '../test/render-settings'
import type { TypographySnapshot } from '../../../shared/typography'

beforeEach(() => localStorage.clear())

async function openSettings(port: DataPort): Promise<ReturnType<typeof renderSettings>> {
  const button = screen.getByRole<HTMLButtonElement>('button', { name: 'Settings' })
  await waitFor(() => expect(button.disabled).toBe(false))
  await act(async () => {
    fireEvent.click(button)
  })
  const settings = renderSettings(port)
  await screen.findByRole('heading', { name: 'Typography' })
  await waitFor(() => expect(screen.queryByText('Loading system fonts…')).toBeNull())
  return settings
}

it('changes independent line heights and restores only the selected context', async () => {
  const fake = createFakePort()
  renderApp(fake.port)
  await openSettings(fake.port)
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Editor line height'), { target: { value: '1.5' } })
  })
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Preview line height'), { target: { value: '1.25' } })
  })
  expect(screen.queryByLabelText('Interface line height')).toBeNull()
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Increase editor line height' }))
  })
  expect((screen.getByLabelText('Editor line height') as HTMLInputElement).value).toBe('1.6')
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Restore editor defaults' }))
  })
  expect((screen.getByLabelText('Editor line height') as HTMLInputElement).value).toBe('2')
  expect((screen.getByLabelText('Preview line height') as HTMLInputElement).value).toBe('1.25')
})

it('focuses the heading after settings hydration makes its controls available', async () => {
  const fake = createFakePort()
  renderApp(fake.port)
  await openSettings(fake.port)
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Typography' }))
})

it('applies independent typography immediately, restores one context and persists on remount', async () => {
  const fake = createFakePort()
  const main = renderApp(fake.port)
  const settings = await openSettings(fake.port)
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Editor font size (px)'), { target: { value: '24' } })
  })
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Preview font size (px)'), { target: { value: '20' } })
  })
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Interface scale (%)'), { target: { value: '150' } })
  })
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Editor font'), { target: { value: 'Monaspace Neon' } })
  })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Restore preview defaults' }))
  })
  expect((screen.getByLabelText('Preview font size (px)') as HTMLInputElement).value).toBe('16')
  expect((screen.getByLabelText('Editor font size (px)') as HTMLInputElement).value).toBe('24')
  settings.unmount()
  main.unmount()
  const restarted = createFakePort()
  renderApp(restarted.port)
  await openSettings(restarted.port)
  expect((screen.getByLabelText('Editor font') as HTMLSelectElement).value).toBe('Monaspace Neon')
  expect((screen.getByLabelText('Editor font size (px)') as HTMLInputElement).value).toBe('24')
  expect((screen.getByLabelText('Interface scale (%)') as HTMLInputElement).value).toBe('150')
})

it('keeps an incomplete draft editable and its selection while settings is open', async () => {
  const fake = createFakePort()
  renderApp(fake.port)
  await screen.findByText('No stories yet')
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'New Story' }))
  })
  const editor = document.querySelector('.cm-editor') as HTMLElement
  const view = EditorView.findFromDOM(editor)!
  act(() =>
    view.dispatch({ changes: { from: 0, insert: 'An unfinished draft' }, selection: { anchor: 5 } })
  )
  const settings = await openSettings(fake.port)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('region', { name: 'Story editor' })).toBeTruthy()
  act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: ' continues' } }))
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }))
  })
  expect(fake.calls.closeSettings).toBe(1)
  settings.unmount()
  expect(document.querySelector('.cm-editor')).toBe(editor)
  expect(view.state.doc.toString()).toBe('An unfinished draft continues')
  expect(view.state.selection.main.head).toBe(5)
  expect(fake.calls.createStory).toBe(0)
})

it('searches system fonts and recovers a missing family without losing the preference', async () => {
  const fake = createFakePort({ fontFamilies: ['inter', 'Local Serif', 'Local Serif'] })
  renderApp(fake.port)
  let settings = await openSettings(fake.port)
  const select = screen.getByLabelText('Preview font')
  expect(within(select).getAllByRole('option', { name: 'Inter' })).toHaveLength(1)
  expect(within(select).getAllByRole('option', { name: 'Local Serif' })).toHaveLength(1)
  await act(async () => {
    fireEvent.change(select, { target: { value: 'Local Serif' } })
  })
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Search preview fonts'), {
      target: { value: 'monaspace' }
    })
  })
  expect(within(select).queryByRole('option', { name: 'Inter' })).toBeNull()
  fake.port.listFontFamilies = async () => []
  settings.unmount()
  settings = await openSettings(fake.port)
  expect(await screen.findByText(/Unavailable font: Local Serif/)).toBeTruthy()
  expect((screen.getByLabelText('Preview font') as HTMLSelectElement).value).toBe('Local Serif')
  fake.port.listFontFamilies = async () => ['Local Serif']
  settings.unmount()
  await openSettings(fake.port)
  expect(screen.queryByText(/Unavailable font:/)).toBeNull()
  expect((screen.getByLabelText('Preview font') as HTMLSelectElement).value).toBe('Local Serif')
})

it('keeps bundled fonts and session choices after catalog and persistence failure', async () => {
  const fake = createFakePort()
  fake.port.listFontFamilies = async () => {
    throw new Error('unavailable')
  }
  renderApp(fake.port)
  const settings = await openSettings(fake.port)
  expect(await screen.findByText(/System fonts could not be loaded/)).toBeTruthy()
  const write = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('full')
  })
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Editor font'), { target: { value: 'Monaspace Argon' } })
  })
  expect(await screen.findByText(/could not be saved/)).toBeTruthy()
  expect((screen.getByLabelText('Editor font') as HTMLSelectElement).value).toBe('Monaspace Argon')
  settings.unmount()
  await openSettings(fake.port)
  expect((screen.getByLabelText('Editor font') as HTMLSelectElement).value).toBe('Monaspace Argon')
  write.mockRestore()
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Editor font size (px)'), { target: { value: '22' } })
  })
  await waitFor(() => expect(screen.queryByText(/could not be saved/)).toBeNull())
})

it('allows typing through an invalid intermediate value without applying it', async () => {
  const fake = createFakePort()
  renderApp(fake.port)
  await openSettings(fake.port)
  const size = screen.getByLabelText('Editor font size (px)') as HTMLInputElement
  await act(async () => {
    fireEvent.change(size, { target: { value: '2' } })
  })
  expect(size.value).toBe('2')
  await act(async () => {
    fireEvent.change(size, { target: { value: '24' } })
  })
  await act(async () => {
    fireEvent.blur(size)
  })
  expect(size.value).toBe('24')
  await act(async () => {
    fireEvent.change(size, { target: { value: '99' } })
  })
  await act(async () => {
    fireEvent.blur(size)
  })
  expect(size.value).toBe('24')
  const height = screen.getByLabelText('Editor line height') as HTMLInputElement
  await act(async () => {
    fireEvent.change(height, { target: { value: '0' } })
  })
  await act(async () => {
    fireEvent.blur(height)
  })
  expect(height.value).toBe('2')
})

it('ignores late hydration and saves once per update without echoing received changes', async () => {
  const fake = createFakePort()
  renderApp(fake.port)
  await waitFor(() =>
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Settings' }).disabled).toBe(false)
  )
  const old = await fake.port.getTypography()
  let finish!: (snapshot: TypographySnapshot) => void
  fake.port.getTypography = () =>
    new Promise((resolve) => {
      finish = resolve
    })
  const writes = jest.spyOn(Storage.prototype, 'setItem')
  const settings = renderSettings(fake.port)
  await act(async () => {
    await fake.port.patchTypography({ context: 'editor', changes: { lineHeight: 1.5 } })
  })
  expect(((await screen.findByLabelText('Editor line height')) as HTMLInputElement).value).toBe(
    '1.5'
  )
  await act(async () => {
    finish(old)
  })
  expect((screen.getByLabelText('Editor line height') as HTMLInputElement).value).toBe('1.5')
  settings.unmount()
  await act(async () => {
    await fake.port.patchTypography({ context: 'preview', changes: { lineHeight: 1.25 } })
  })
  expect(writes.mock.calls.filter(([key]) => key === 'draftwrite.typography')).toHaveLength(2)
  writes.mockRestore()
})
