import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, type JSX } from 'react'
import { Resizer } from './Resizer'
import { useSplitResizer } from './use-resizer'

function SplitHarness(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const { ratio, canResize, resizerProps } = useSplitResizer({
    storageKey: 'test-split',
    containerRef,
    defaultRatio: 0.5,
    minRatio: 0.2,
    maxRatio: 0.8,
    minPanePx: 160,
    label: 'Resize test split'
  })

  return (
    <div ref={containerRef}>
      <output data-testid="ratio">{Math.round(ratio * 100)}</output>
      <output data-testid="can-resize">{String(canResize)}</output>
      {canResize ? <Resizer {...resizerProps} /> : null}
    </div>
  )
}

function stubClientWidth(width: number): void {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => width
  })
}

let originalClientWidth: PropertyDescriptor | undefined

beforeEach(() => {
  window.localStorage.clear()
  document.body.style.userSelect = ''
  originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
  stubClientWidth(400)
})

afterEach(() => {
  if (originalClientWidth === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth)
  }
})

describe('useSplitResizer', () => {
  it('reports the ratio and its limits', () => {
    render(<SplitHarness />)

    const separator = screen.getByRole('separator', { name: 'Resize test split' })

    expect(screen.getByTestId('ratio').textContent).toBe('50')
    expect(screen.getByTestId('can-resize').textContent).toBe('true')
    expect(separator.getAttribute('aria-valuenow')).toBe('50')
    expect(separator.getAttribute('aria-valuemin')).toBe('40')
    expect(separator.getAttribute('aria-valuemax')).toBe('60')
  })

  it('resizes with the arrow keys and resets with a double click', () => {
    render(<SplitHarness />)
    const separator = screen.getByRole('separator', { name: 'Resize test split' })

    fireEvent.keyDown(separator, { key: 'ArrowRight' })
    expect(screen.getByTestId('ratio').textContent).toBe('52')

    fireEvent.keyDown(separator, { key: 'End' })
    expect(screen.getByTestId('ratio').textContent).toBe('60')

    fireEvent.doubleClick(separator)
    expect(screen.getByTestId('ratio').textContent).toBe('50')
    expect(window.localStorage.getItem('draftwrite.panel.test-split')).toBe('0.5')
  })

  it('drags the split and clamps the new ratio', () => {
    render(<SplitHarness />)
    const separator = screen.getByRole('separator', { name: 'Resize test split' })

    fireEvent(
      separator,
      new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 100, button: 0 })
    )
    fireEvent(separator, new MouseEvent('pointermove', { bubbles: true, clientX: 140 }))
    fireEvent(separator, new MouseEvent('pointerup', { bubbles: true }))

    // 40 px over a 400 px container is +0.1, clamped to the 0.6 maximum.
    expect(screen.getByTestId('ratio').textContent).toBe('60')
  })

  it('hides the handle when the container cannot hold two minimum panes', () => {
    stubClientWidth(300)
    render(<SplitHarness />)

    expect(screen.getByTestId('can-resize').textContent).toBe('false')
    expect(screen.queryByRole('separator', { name: 'Resize test split' })).toBeNull()
  })
})
