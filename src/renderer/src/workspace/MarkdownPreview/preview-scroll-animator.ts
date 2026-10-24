/**
 * The preview's owner of the scroll animation.
 *
 * `PreviewCursorSync` gives this module a destination and a reason, and never
 * touches `scrollTop` itself:
 *
 * - `layout` writes at once. Mount, resize, a mode change, a late image and a
 *   `markdown` change all move the viewport, not the caret, so animating them
 *   would be a movement nobody asked for.
 * - `caret` goes through the shared animator of `scroll/smooth-scroll.ts`: a new
 *   caret line above the threshold flies for 150 ms, a one line adjustment is
 *   written at once.
 *
 * The module also owns the listeners that cancel a flight (wheel, touch, a
 * pointer or mouse button on the scroller, a window resize and a foreign
 * scroll, i.e. the scrollbar), so the component only wires the lifecycle.
 */
import {
  createScrollAnimator,
  isForeignScroll,
  type FrameScheduler,
  type Scroller,
  type ScrollOutcome
} from '../../scroll/smooth-scroll'

/** Only a new caret line may animate; everything else is written at once. */
export type PreviewScrollReason = 'caret' | 'layout'

/** The scroller of the animator, plus the value it wrote last. */
export type TrackedScroller = Scroller & {
  /** Last `scrollTop` written by the animator: what the scrollbar guard reads. */
  readonly lastWrittenTop: number
}

/**
 * Wraps the live element so every write of the animator is remembered. The
 * guard needs it to tell "the browser moved us" from "the user moved us".
 */
export function trackScroller(container: HTMLElement): TrackedScroller {
  let lastWritten = container.scrollTop

  return {
    get scrollTop() {
      return container.scrollTop
    },
    set scrollTop(value: number) {
      lastWritten = value
      container.scrollTop = value
    },
    get clientHeight() {
      return container.clientHeight
    },
    get scrollHeight() {
      return container.scrollHeight
    },
    get lastWrittenTop() {
      return lastWritten
    }
  }
}

export interface PreviewScrollAnimatorDeps {
  /** The element that scrolls. */
  container: HTMLElement
  /** Frame source: `browserFrameScheduler(window)` in the app, a clock in tests. */
  scheduler: FrameScheduler
  /** Where the `resize` listener goes. Defaults to the container's window. */
  win?: Window | null
}

export interface PreviewScrollAnimator {
  /** The scroller this animator writes to. */
  readonly container: HTMLElement
  /** The single write point of the preview scroll. */
  scrollTo: (target: number, reason: PreviewScrollReason, lineUnit: number) => ScrollOutcome
  cancel: (reason: string) => void
  isAnimating: () => boolean
  /** Cancels the flight and removes every listener. */
  destroy: () => void
}

/**
 * True when the live `scrollTop` cannot be explained by the value the animator
 * wrote: the user (wheel, keyboard, scrollbar) owns the scroll now.
 *
 * The comparison runs against the written value and against that value clamped
 * to the live scrollable range, so a `scrollHeight` that shrinks mid-flight
 * (the scrollbar appearing, a spacer going back to zero) is not read as a
 * gesture.
 */
export function isForeignPreviewScroll(scroller: TrackedScroller): boolean {
  const actual = scroller.scrollTop
  const written = scroller.lastWrittenTop

  if (!isForeignScroll(actual, written)) {
    return false
  }

  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
  const clamped = Math.min(Math.max(written, 0), maxScroll)

  return isForeignScroll(actual, clamped)
}

export function createPreviewScrollAnimator({
  container,
  scheduler,
  win = container.ownerDocument.defaultView
}: PreviewScrollAnimatorDeps): PreviewScrollAnimator {
  const scroller = trackScroller(container)
  const animator = createScrollAnimator(scroller, scheduler)

  function scrollTo(target: number, reason: PreviewScrollReason, lineUnit: number): ScrollOutcome {
    if (reason === 'layout') {
      // A layout sync invalidates whatever the caret asked for: the spacers and
      // the destination were measured before it, so the flight must not survive
      // it, not even for one frame.
      animator.cancel('layout')
      scroller.scrollTop = target

      return 'instant'
    }

    return animator.request(target, { lineUnit })
  }

  function onWheel(): void {
    animator.cancel('wheel')
  }

  function onTouchStart(): void {
    animator.cancel('touchstart')
  }

  function onPointerDown(): void {
    animator.cancel('pointerdown')
  }

  function onMouseDown(): void {
    animator.cancel('mousedown')
  }

  function onResize(): void {
    animator.cancel('resize')
  }

  function onScroll(): void {
    // Outside a flight nothing of ours is writing, so a `scroll` is the user's
    // and there is nothing to take back.
    if (!animator.isAnimating()) {
      return
    }

    if (isForeignPreviewScroll(scroller)) {
      animator.cancel('scroll')
    }
  }

  container.addEventListener('wheel', onWheel, { passive: true })
  container.addEventListener('touchstart', onTouchStart, { passive: true })
  container.addEventListener('pointerdown', onPointerDown, { passive: true })
  container.addEventListener('mousedown', onMouseDown, { passive: true })
  container.addEventListener('scroll', onScroll, { passive: true })
  win?.addEventListener('resize', onResize)

  function destroy(): void {
    animator.cancel('destroy')
    container.removeEventListener('wheel', onWheel)
    container.removeEventListener('touchstart', onTouchStart)
    container.removeEventListener('pointerdown', onPointerDown)
    container.removeEventListener('mousedown', onMouseDown)
    container.removeEventListener('scroll', onScroll)
    win?.removeEventListener('resize', onResize)
  }

  return {
    container,
    scrollTo,
    cancel: (reason) => animator.cancel(reason),
    isAnimating: () => animator.isAnimating(),
    destroy
  }
}
