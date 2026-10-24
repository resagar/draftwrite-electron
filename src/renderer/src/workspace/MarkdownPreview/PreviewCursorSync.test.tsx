import { beforeEach, describe, expect, it } from '@jest/globals'
import { act, render } from '@testing-library/react'
import { publishStatus, resetStatus } from '../../state/status-store'
import { PreviewCursorSync, type PreviewCursorSyncProps } from './PreviewCursorSync'

type Fixture = {
  container: HTMLElement
  article: HTMLElement
  topSpacer: HTMLElement
  bottomSpacer: HTMLElement
}

type Rect = {
  top: number
  bottom: number
  height: number
  left: number
  right: number
  width: number
  x: number
  y: number
  toJSON: () => Record<string, never>
}

const stubRect = (element: HTMLElement, top: number, height: number): void => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: (): Rect => ({
      top,
      bottom: top + height,
      height,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: top,
      toJSON: () => ({})
    })
  })
}

const stubNumber = (
  element: HTMLElement,
  property: 'clientHeight' | 'scrollHeight' | 'scrollTop',
  value: number
): void => {
  Object.defineProperty(element, property, { configurable: true, value, writable: true })
}

const buildFixture = (): Fixture => {
  document.body.innerHTML = `
    <section>
      <div data-preview-spacer="top"></div>
      <article>
        <p data-source-start-line="1" data-source-end-line="1"><span data-source-line="1"></span>text</p>
        <hr data-source-start-line="5" data-source-end-line="5">
      </article>
      <div data-preview-spacer="bottom"></div>
    </section>
  `

  const container = document.querySelector('section') as HTMLElement
  const article = container.querySelector('article') as HTMLElement
  const topSpacer = container.querySelector('[data-preview-spacer="top"]') as HTMLElement
  const bottomSpacer = container.querySelector('[data-preview-spacer="bottom"]') as HTMLElement

  stubRect(container, 0, 500)
  stubNumber(container, 'clientHeight', 500)
  stubNumber(container, 'scrollHeight', 5000)
  stubNumber(container, 'scrollTop', 500)
  stubRect(article, 100, 600)
  stubRect(article.querySelector('p') as HTMLElement, 132, 40)
  stubRect(article.querySelector('hr') as HTMLElement, 400, 20)
  stubRect(article.querySelector('[data-source-line="1"]') as HTMLElement, 700, 40)

  return { container, article, topSpacer, bottomSpacer }
}

const refsOf = ({
  container,
  article,
  topSpacer,
  bottomSpacer
}: Fixture): Pick<
  PreviewCursorSyncProps,
  'containerRef' | 'articleRef' | 'topSpacerRef' | 'bottomSpacerRef'
> => ({
  containerRef: { current: container },
  articleRef: { current: article },
  topSpacerRef: { current: topSpacer },
  bottomSpacerRef: { current: bottomSpacer }
})

describe('PreviewCursorSync', () => {
  beforeEach(() => {
    resetStatus()
  })

  it('renders nothing of its own', () => {
    const fixture = buildFixture()
    const { container: root } = render(
      <PreviewCursorSync markdown="# Title" {...refsOf(fixture)} />
    )

    expect(root.querySelector('*')).toBeNull()
  })

  it('writes the spacers on mount without moving the article', () => {
    const fixture = buildFixture()

    render(<PreviewCursorSync markdown="# Title" {...refsOf(fixture)} />)

    expect(fixture.topSpacer.style.height).toBe('198px')
    expect(fixture.bottomSpacer.style.height).toBe('200px')
    // First sync without a cursor: no compensation, so the article stays put.
    expect(fixture.container.scrollTop).toBe(500)
  })

  it('compensates the top spacer on a later sync without a cursor', () => {
    const fixture = buildFixture()
    const { rerender } = render(<PreviewCursorSync markdown="one" {...refsOf(fixture)} />)

    // The content above shrank: T goes from 198 to 166 (32 px).
    stubRect(fixture.article.querySelector('p') as HTMLElement, 164, 40)
    rerender(<PreviewCursorSync markdown="two" {...refsOf(fixture)} />)

    expect(fixture.topSpacer.style.height).toBe('166px')
    expect(fixture.container.scrollTop).toBe(468)
  })

  it('centres the published cursor line', () => {
    const fixture = buildFixture()

    render(<PreviewCursorSync markdown="# Title" {...refsOf(fixture)} />)

    act(() => {
      publishStatus({ cursor: { line: 1, column: 3 } })
    })

    // Marker at 700 in viewport coordinates with the scroller at 500 → 1200 in
    // content coordinates; its centre (1220) in the middle of 500 is 970.
    expect(fixture.container.scrollTop).toBe(970)
  })

  it('does nothing without a viewport, as in jsdom or a hidden pane', () => {
    const fixture = buildFixture()
    stubNumber(fixture.container, 'clientHeight', 0)

    render(<PreviewCursorSync markdown="# Title" {...refsOf(fixture)} />)

    expect(fixture.topSpacer.style.height).toBe('')
    expect(fixture.container.scrollTop).toBe(500)
  })

  it('observes the container and the article, and disconnects on unmount', () => {
    const observed: Element[] = []
    let disconnected = 0

    class FakeResizeObserver {
      observe(element: Element): void {
        observed.push(element)
      }

      unobserve(): void {
        // Every observation is dropped by `disconnect`, which is what the test counts.
      }

      disconnect(): void {
        disconnected += 1
      }
    }

    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: FakeResizeObserver
    })

    try {
      const fixture = buildFixture()
      const { unmount } = render(<PreviewCursorSync markdown="# Title" {...refsOf(fixture)} />)

      expect(observed).toEqual([fixture.container, fixture.article])

      unmount()

      expect(disconnected).toBe(1)
    } finally {
      Reflect.deleteProperty(globalThis, 'ResizeObserver')
    }
  })
})
