import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { expect, it, jest } from '@jest/globals'
import type { WindowState, WindowControlsPort } from '../../../../shared/window-controls'
import { createFakePort } from '../../data/fake/fake-port'
import { renderApp } from '../../test/render-app'

function fixture(translucent = true): {
  fake: ReturnType<typeof createFakePort>
  controls: WindowControlsPort
  emit: (state: WindowState) => void
  unsubscribe: ReturnType<typeof jest.fn>
} {
  const fake = createFakePort()
  let listener: ((state: WindowState) => void) | null = null
  const unsubscribe = jest.fn()
  const controls: WindowControlsPort = {
    getState: async () => ({ translucent, maximized: false }),
    execute: jest.fn(async () => ({ translucent, maximized: false })),
    onChanged: (next) => {
      listener = next
      return unsubscribe
    }
  }
  fake.port.windowControls = controls
  return {
    fake,
    controls,
    emit: (state) => {
      listener?.(state)
    },
    unsubscribe
  }
}

it('renders custom controls only in translucent mode and routes each action', async () => {
  const f = fixture()
  renderApp(f.fake.port)
  fireEvent.click(await screen.findByRole('button', { name: 'Minimize window' }))
  fireEvent.click(screen.getByRole('button', { name: 'Maximize window' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close window' }))
  expect(f.controls.execute).toHaveBeenNthCalledWith(1, 'minimize')
  expect(f.controls.execute).toHaveBeenNthCalledWith(2, 'toggle-maximize')
  expect(f.controls.execute).toHaveBeenNthCalledWith(3, 'close')
  expect(document.documentElement.dataset.contentTranslucent).toBe('true')
})

it('tracks external maximize events and removes listeners and surface mode on unmount', async () => {
  const f = fixture()
  const mounted = renderApp(f.fake.port)
  await screen.findByRole('button', { name: 'Maximize window' })
  act(() => f.emit({ translucent: true, maximized: true }))
  expect(screen.getByRole('button', { name: 'Restore window' })).toBeTruthy()
  mounted.unmount()
  expect(f.unsubscribe).toHaveBeenCalledTimes(1)
  expect(document.documentElement.dataset.contentTranslucent).toBeUndefined()
})

it('does not activate translucent surfaces or replace native controls in opaque mode', async () => {
  const f = fixture(false)
  await act(async () => {
    renderApp(f.fake.port)
  })
  expect(screen.queryByRole('button', { name: 'Close window' })).toBeNull()
  expect(document.documentElement.dataset.contentTranslucent).toBeUndefined()
})

it('keeps external state when the initial state reply arrives late', async () => {
  const f = fixture()
  let release!: (state: WindowState) => void
  f.controls.getState = () =>
    new Promise((resolve) => {
      release = resolve
    })
  renderApp(f.fake.port)
  act(() => f.emit({ translucent: true, maximized: true }))
  await act(async () => release({ translucent: true, maximized: false }))
  expect(screen.getByRole('button', { name: 'Restore window' })).toBeTruthy()
})

it('reports a failed window action without changing draft or appearance state', async () => {
  const f = fixture()
  jest.spyOn(f.controls, 'execute').mockRejectedValueOnce(new Error('failed'))
  renderApp(f.fake.port)
  fireEvent.click(await screen.findByRole('button', { name: 'Minimize window' }))
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain('window action failed')
  )
  expect(document.documentElement.dataset.contentTranslucent).toBe('true')
})

it('uses the native backdrop without drawing custom controls and cleans up its marker', async () => {
  const f = fixture()
  f.controls.getState = async () => ({ translucent: true, maximized: false, backdrop: 'acrylic' })
  let mounted!: ReturnType<typeof renderApp>
  await act(async () => {
    mounted = renderApp(f.fake.port)
  })
  expect(document.documentElement.dataset.contentTranslucent).toBe('true')
  expect(document.documentElement.dataset.windowBackdrop).toBe('acrylic')
  expect(screen.queryByRole('button', { name: 'Close window' })).toBeNull()
  mounted.unmount()
  expect(document.documentElement.dataset.windowBackdrop).toBeUndefined()
})
