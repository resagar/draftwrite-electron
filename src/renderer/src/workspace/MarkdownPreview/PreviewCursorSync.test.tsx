import { beforeEach, describe, expect, it, jest } from '@jest/globals'

// Two jsdom-unfriendly pieces are replaced by their seam:
// - the animator is a real flight loop over a real `scrollTop`, tested in
//   `preview-scroll-animator.test.ts`;
// - the measurement reads layout (`getBoundingClientRect`, `getClientRects`,
//   `clientHeight`), which jsdom does not implement; its arithmetic is tested
//   with plain rects in `preview-sync.test.ts`.
// What is left here is the orchestration: who is asked, in which order and with
// which reason.
jest.mock('./preview-scroll-animator', () => ({ createPreviewScrollAnimator: jest.fn() }))
jest.mock('./preview-sync', () => ({ measurePreviewSync: jest.fn() }))

import { act, render } from '@testing-library/react'
import { publishStatus, resetStatus } from '../../state/status-store'
import type { PreviewScrollAnimator } from './preview-scroll-animator'
import { createPreviewScrollAnimator } from './preview-scroll-animator'
import { measurePreviewSync, type PreviewMeasurement } from './preview-sync'
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

/**
 * Order in which the component cancelled a flight and measured the preview:
 * the once-only `scrollHeight` of the spacers must never be rewritten while a
 * flight is still aiming at it.
 */
type Step = 'cancel:resync' | 'cancel:hidden' | 'measure'

let steps: Step[] = []

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

/** Fixed measurements, one per sync, in the order the syncs happen. */
const stubMeasurements = (...measurements: PreviewMeasurement[]): void => {
  jest.mocked(measurePreviewSync).mockImplementation(() => {
    steps.push('measure')

    return measurements.shift() ?? null
  })
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
        steps.push(reason === 'resync' ? 'cancel:resync' : 'cancel:hidden')
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

/** A measurement with a target, as the preview would produce for a line. */
const aimed = (target: number, topSpacer = 198, lineUnit = 40): PreviewMeasurement => ({
  topSpacer,
  target,
  lineUnit
})

/** A measurement without a caret to follow. */
const unaimed = (topSpacer = 198, lineUnit = 22): PreviewMeasurement => ({
  topSpacer,
  target: null,
  lineUnit
})

describe('PreviewCursorSync', () => {
  beforeEach(() => {
    resetStatus()
    steps = []
  })

  it('renders nothing of its own', () => {
    stubAnimators()
    stubMeasurements()
    const fixture = buildFixture()
    const { container: root } = render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

    expect(root.querySelector('*')).toBeNull()
  })

  it('cancels the flight before the spacers are rewritten', () => {
    const animators = stubAnimators()
    stubMeasurements(unaimed())
    const fixture = buildFixture()

    render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

    expect(steps).toEqual(['cancel:resync', 'measure'])
    expect(single(animators).cancels).toEqual(['resync'])
  })

  it('measures the preview with the elements it was given and the current line', () => {
    const animators = stubAnimators()
    stubMeasurements(unaimed())
    const fixture = buildFixture()

    render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

    const [args] = jest.mocked(measurePreviewSync).mock.calls[0] ?? []

    expect(args).toEqual({
      container: fixture.container,
      article: fixture.article,
      topSpacer: fixture.topSpacer,
      bottomSpacer: fixture.bottomSpacer,
      line: null
    })
    expect(animators).toHaveLength(1)
  })

  it('requests nothing on the first sync without a cursor', () => {
    const animators = stubAnimators()
    stubMeasurements(unaimed())
    const fixture = buildFixture()

    render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

    // The first sync does not compensate the top spacer: the article must not
    // jump when the preview mounts.
    expect(single(animators).calls).toHaveLength(0)
  })

  it('compensates the top spacer on a later sync without a cursor', () => {
    const animators = stubAnimators()
    // The content above shrank: T goes from 198 to 166 (32 px).
    stubMeasurements(unaimed(198), unaimed(166))
    const fixture = buildFixture()
    const { rerender } = render(<PreviewCursorSync markdown="one" {...fixture.refs} />)

    rerender(<PreviewCursorSync markdown="two" {...fixture.refs} />)

    // Moving the article with the spacers is a layout correction, not a caret
    // jump: it is written at once and may be negative (jsdom never scrolled, so
    // the live `scrollTop` the component reads is 0).
    expect(single(animators).calls).toEqual([{ target: -32, reason: 'layout', lineUnit: 22 }])
  })

  it('asks the animator for a caret flight when the cursor line moves', () => {
    const animators = stubAnimators()
    stubMeasurements(unaimed(), aimed(970))
    const fixture = buildFixture()

    render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

    act(() => {
      publishStatus({ cursor: { line: 1, column: 3, origin: 'keyboard' } })
    })

    expect(single(animators).calls).toEqual([{ target: 970, reason: 'caret', lineUnit: 40 }])
  })

  it('does not animate when the same line is re-synced by a markdown change', () => {
    const animators = stubAnimators()
    stubMeasurements(unaimed(), aimed(970), aimed(970))
    const fixture = buildFixture()
    const { rerender } = render(<PreviewCursorSync markdown="one" {...fixture.refs} />)

    act(() => {
      publishStatus({ cursor: { line: 1, column: 3, origin: 'keyboard' } })
    })

    rerender(<PreviewCursorSync markdown="two" {...fixture.refs} />)

    expect(single(animators).calls.at(-1)).toEqual({
      target: 970,
      reason: 'layout',
      lineUnit: 40
    })
  })

  it('does not animate the first sync, even with a cursor already published', () => {
    const animators = stubAnimators()
    stubMeasurements(aimed(970))
    const fixture = buildFixture()
    publishStatus({ cursor: { line: 1, column: 3, origin: 'keyboard' } })

    render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

    expect(single(animators).calls).toEqual([{ target: 970, reason: 'layout', lineUnit: 40 }])
  })

  it('animates a caret move after a pointer gesture settled the caret', () => {
    const animators = stubAnimators()
    stubMeasurements(unaimed(), aimed(1200))
    const fixture = buildFixture()

    render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

    act(() => {
      publishStatus({ cursor: { line: 7, column: 1, origin: 'pointer' } })
    })

    // Both origins are followable: the store only ever holds a settled caret.
    expect(single(animators).calls.at(-1)).toEqual({
      target: 1200,
      reason: 'caret',
      lineUnit: 40
    })
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
      // The panel grew: the same caret line now needs a different destination.
      stubMeasurements(unaimed(), aimed(970), aimed(830))
      const fixture = buildFixture()

      render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

      act(() => {
        publishStatus({ cursor: { line: 1, column: 3, origin: 'keyboard' } })
      })

      expect(single(animators).calls.at(-1)).toMatchObject({ target: 970, reason: 'caret' })

      act(() => {
        observerCallback?.()
      })

      expect(single(animators).calls.at(-1)).toEqual({
        target: 830,
        reason: 'layout',
        lineUnit: 40
      })
    } finally {
      Reflect.deleteProperty(globalThis, 'ResizeObserver')
    }
  })

  it('cancels instead of scrolling when there is no viewport to measure', () => {
    const animators = stubAnimators()
    // A hidden pane, or jsdom itself: the measurement refuses to produce one.
    stubMeasurements()
    const fixture = buildFixture()

    render(<PreviewCursorSync markdown="# Title" {...fixture.refs} />)

    expect(single(animators).calls).toHaveLength(0)
    expect(single(animators).cancels).toEqual(['resync', 'hidden'])
  })

  it('keeps one animator per container and destroys it on unmount', () => {
    const animators = stubAnimators()
    stubMeasurements(unaimed(), unaimed())
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
      stubMeasurements()
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
