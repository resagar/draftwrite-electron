import { beforeEach, describe, expect, it, jest } from '@jest/globals'

// The animator is a jsdom-unfriendly flight loop (real `rAF`, real `scrollTop`),
// so the sync is tested for what it decides: the destination, the reason and
// the order of the cancel. Its own behaviour is covered by
// `preview-scroll-animator.test.ts`.
jest.mock('./preview-scroll-animator', () => ({ createPreviewScrollAnimator: jest.fn() }))

import { act, render } from '@testing-library/react'
import { publishStatus, resetStatus } from '../../state/status-store'
import type { PreviewScrollAnimator } from './preview-scroll-animator'
import { createPreviewScrollAnimator } from './preview-scroll-animator'
import { PreviewCursorSync, type PreviewCursorSyncProps } from './PreviewCursorSync'

type Fixture = {
  container: HTMLElement
  article: HTMLElement
  topSpacer: HTMLElement
  bottomSpacer: HTMLElement
  refs: Pick<
    PreviewCursorSyncProps,
    'containerRef' | 'articleRef' | 'topSpacerRef' | 'bottomSpacerRef'
  >
}

type ScrollCall = { target: number; reason: string; lineUnit: number }

type FakeAnimator = PreviewScrollAnimator & {
  calls: ScrollCall[]
  cancels: string[]
  destroyed: boolean
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

/** Runs inside `cancel`, so a test can see the DOM as it was before it. */
let onCancel: (() => void) | null = null

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

  return {
    container,
    article,
    topSpacer,
    bottomSpacer,
    // Stable ref objects: the real preview holds them for its whole life.
    refs: {
      containerRef: { current: container },
      articleRef: { current: article },
      topSpacerRef: { current: topSpacer },
      bottomSpacerRef: { current: bottomSpacer }
    }
  }
}

/** One animator per container, every call recorded. */
const stubAnimators = (): FakeAnimator[] => {
  const created: FakeAnimator[] = []

  jest.mocked(createPreviewScrollAnimator).mockImplementation(({ container }) => {
    const fake: FakeAnimator = {
      container,
      calls: [],
      cancels: [],
      destroyed: false,
      scrollTo: (target, reason, lineUnit) => {
        fake.calls.push({ target, reason, lineUnit })

        return 'instant'
      },
      cancel: (reason) => {
        fake.cancels.push(reason)
        onCancel?.()
      },
      isAnimating: () => false,
      destroy: () => {
        fake.destroyed = true
      }
    }
    created.push(fake)

    return fake
  })

  return created
}

const single = (animators: FakeAnimator[]): FakeAnimator => {
  expect(animators).toHaveLength(1)

  return animators[0]
}

describe('PreviewCursorSync', () => {
  beforeEach(() => {
    resetStatus()
    onCancel = null
  })

  it('renders nothing of its own', () => {
    stubAnimators()
    const fixture = buildFixture()
    const { container: root } = render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

    expect(root.querySelector('*')).toBeNull()
  })

  it('writes the spacers on mount, instantly and without moving the article', () => {
    const animators = stubAnimators()
    const fixture = buildFixture()

    render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

    expect(fixture.topSpacer.style.height).toBe('198px')
    expect(fixture.bottomSpacer.style.height).toBe('200px')
    // First sync without a cursor: no compensation, so the article stays put.
    expect(fixture.container.scrollTop).toBe(500)
    // Nothing to centre yet, so nothing is requested.
    expect(single(animators).calls).toHaveLength(0)
  })

  it('cancels any flight before rewriting the spacers', () => {
    const animators = stubAnimators()
    const fixture = buildFixture()
    const heightsAtCancel: string[] = []
    onCancel = () => heightsAtCancel.push(fixture.topSpacer.style.height)

    render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

    const animator = single(animators)

    expect(animator.cancels).toEqual(['resync'])
    // The spacers still had their previous height when the flight was stopped.
    expect(heightsAtCancel).toEqual([''])
  })

  it('compensates the top spacer on a later sync without a cursor', () => {
    const animators = stubAnimators()
    const fixture = buildFixture()
    const { rerender } = render(<PreviewCursorSync markdown="one" {...fixture.refs} />)

    // The content above shrank: T goes from 198 to 166 (32 px).
    stubRect(fixture.article.querySelector('p') as HTMLElement, 164, 40)
    rerender(<PreviewCursorSync markdown="two" {...fixture.refs} />)

    expect(fixture.topSpacer.style.height).toBe('166px')
    // Moving the article with the spacers is a layout correction, not a caret
    // jump: it is written at once. Without a target there is no measured row, so
    // the fallback line unit travels along, unused.
    expect(single(animators).calls).toEqual([{ target: 468, reason: 'layout', lineUnit: 22 }])
  })

  it('asks the animator for a caret flight when the cursor line moves', () => {
    const animators = stubAnimators()
    const fixture = buildFixture()

    render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

    act(() => {
      publishStatus({ cursor: { line: 1, column: 3, origin: 'keyboard' } })
    })

    // Marker at 700 in viewport coordinates with the scroller at 500 → 1200 in
    // content coordinates; its centre (1220) in the middle of 500 is 970.
    const calls = single(animators).calls

    expect(calls.at(-1)).toEqual({ target: 970, reason: 'caret', lineUnit: 40 })
  })

  it('does not animate when the same line is re-synced by a markdown change', () => {
    const animators = stubAnimators()
    const fixture = buildFixture()
    const { rerender } = render(<PreviewCursorSync markdown="one" {...fixture.refs} />)

    act(() => {
      publishStatus({ cursor: { line: 1, column: 3, origin: 'keyboard' } })
    })

    rerender(<PreviewCursorSync markdown="two" {...fixture.refs} />)

    const calls = single(animators).calls

    expect(calls.at(-1)).toEqual({ target: 970, reason: 'layout', lineUnit: 40 })
  })

  it('does not animate the first sync, even with a cursor already published', () => {
    const animators = stubAnimators()
    const fixture = buildFixture()
    publishStatus({ cursor: { line: 1, column: 3, origin: 'keyboard' } })

    render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

    expect(single(animators).calls).toEqual([{ target: 970, reason: 'layout', lineUnit: 40 }])
  })

  it('does not animate a geometry change reported by the ResizeObserver', () => {
    let observerCallback: (() => void) | null = null

    class FakeResizeObserver {
      observe(): void {
        // Only the first construction matters: the sync uses one observer.
      }

      unobserve(): void {
        // Dropped with the observer.
      }

      disconnect(): void {
        // Nothing to release in the fake.
      }

      constructor(callback: () => void) {
        observerCallback = callback
      }
    }

    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: FakeResizeObserver
    })

    try {
      const animators = stubAnimators()
      const fixture = buildFixture()

      render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

      act(() => {
        publishStatus({ cursor: { line: 1, column: 3, origin: 'keyboard' } })
      })

      // The panel grew: the same caret line now needs a different destination.
      stubNumber(fixture.container, 'clientHeight', 600)

      act(() => {
        observerCallback?.()
      })

      const calls = single(animators).calls

      expect(calls.length).toBeGreaterThanOrEqual(2)
      expect(calls.at(-1)?.reason).toBe('layout')
      expect(calls.at(-1)?.target).not.toBe(calls.at(-2)?.target)
    } finally {
      Reflect.deleteProperty(globalThis, 'ResizeObserver')
    }
  })

  it('does nothing without a viewport, as in jsdom or a hidden pane', () => {
    const animators = stubAnimators()
    const fixture = buildFixture()
    stubNumber(fixture.container, 'clientHeight', 0)

    render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

    expect(fixture.topSpacer.style.height).toBe('')
    expect(fixture.container.scrollTop).toBe(500)
    expect(single(animators).calls).toHaveLength(0)
    expect(single(animators).cancels).toEqual(['hidden'])
  })

  it('keeps one animator per container and destroys it on unmount', () => {
    const animators = stubAnimators()
    const fixture = buildFixture()
    const { rerender, unmount } = render(<PreviewCursorSync markdown="one" {...fixture.refs} />)

    rerender(<PreviewCursorSync markdown="two" {...fixture.refs} />)

    expect(animators).toHaveLength(1)
    expect(single(animators).destroyed).toBe(false)

    unmount()

    expect(single(animators).destroyed).toBe(true)
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
      stubAnimators()
      const fixture = buildFixture()
      const { unmount } = render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

      expect(observed).toEqual([fixture.container, fixture.article])

      unmount()

      expect(disconnected).toBe(1)
    } finally {
      Reflect.deleteProperty(globalThis, 'ResizeObserver')
    }
  })
})
