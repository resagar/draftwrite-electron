import { beforeEach, describe, expect, it } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'
import type { JSX } from 'react'
import { Resizer } from './Resizer'
import { usePanelResizer } from './use-resizer'

function PanelHarness(): JSX.Element {
  const { size, resizerProps } = usePanelResizer({
    storageKey: 'test-panel',
    defaultSize: 200,
    min: 100,
    max: 400,
    label: 'Resize test panel'
  })

  return (
    <div>
      <output data-testid="size">{size}</output>
      <Resizer {...resizerProps} />
    </div>
  )
}

beforeEach(() => {
  window.localStorage.clear()
  document.body.style.userSelect = ''
})

describe('usePanelResizer', () => {
  it('exposes a separator with the current width and limits', () => {
    render(<PanelHarness />)

    const separator = screen.getByRole('separator', { name: 'Resize test panel' })

    expect(separator.getAttribute('aria-valuenow')).toBe('200')
    expect(separator.getAttribute('aria-valuemin')).toBe('100')
    expect(separator.getAttribute('aria-valuemax')).toBe('400')
    expect(separator.getAttribute('aria-valuetext')).toBe('200 px')
    expect(separator.getAttribute('tabindex')).toBe('0')
  })

  it('resizes with the arrow keys, Home and End', () => {
    render(<PanelHarness />)
    const separator = screen.getByRole('separator', { name: 'Resize test panel' })

    fireEvent.keyDown(separator, { key: 'ArrowRight' })
    expect(screen.getByTestId('size').textContent).toBe('216')

    fireEvent.keyDown(separator, { key: 'Home' })
    expect(screen.getByTestId('size').textContent).toBe('100')

    fireEvent.keyDown(separator, { key: 'End' })
    expect(screen.getByTestId('size').textContent).toBe('400')
  })

  it('resets with a double click and persists every value', () => {
    render(<PanelHarness />)
    const separator = screen.getByRole('separator', { name: 'Resize test panel' })

    fireEvent.keyDown(separator, { key: 'ArrowRight' })
    expect(window.localStorage.getItem('draftwrite.panel.test-panel')).toBe('216')

    fireEvent.doubleClick(separator)
    expect(screen.getByTestId('size').textContent).toBe('200')
    expect(window.localStorage.getItem('draftwrite.panel.test-panel')).toBe('200')
  })

  it('drags with the pointer and releases the body selection lock', () => {
    render(<PanelHarness />)
    const separator = screen.getByRole('separator', { name: 'Resize test panel' })

    fireEvent(
      separator,
      new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 100, button: 0 })
    )
    expect(document.body.style.userSelect).toBe('none')

    fireEvent(separator, new MouseEvent('pointermove', { bubbles: true, clientX: 140 }))
    fireEvent(separator, new MouseEvent('pointerup', { bubbles: true }))

    expect(screen.getByTestId('size').textContent).toBe('240')
    expect(document.body.style.userSelect).toBe('')
  })
})
