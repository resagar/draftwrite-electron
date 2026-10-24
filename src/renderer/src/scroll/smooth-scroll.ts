/**
 * Shared scroll-motion primitives: duration, easing, threshold and the
 * animator loop used by every scroller in the app (editor and preview).
 *
 * The animator never measures, never computes a destination and never
 * registers listeners: it only writes `scroller.scrollTop`. Everything else
 * is the caller's job, which keeps this module testable without layout.
 */

export const DURATION = 150

/** Sub-pixel and rounding tolerance, in CSS pixels. */
export const SCROLL_EPSILON = 2

/**
 * A delta below this is "already there": writing it would only start a flight
 * nobody can perceive. It also absorbs sub-pixel `scrollTop` noise.
 */
const MIN_DELTA = 1

/** Ease-out cubic: fast start, gentle landing. Expects `t` in `[0, 1]`. */
export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

/**
 * `scrollTop` that leaves a span vertically centered, clamped to the scrollable
 * range: `top + height / 2 - viewportHeight / 2`.
 *
 * The caller decides which span to hand over — the editor adds its padding to
 * `top`, the preview narrows a target taller than the viewport to its first
 * row — so this is the only centering arithmetic in the app: both scrollers use
 * it, which is what keeps their motion comparable.
 */
export function centerOffset(
  top: number,
  height: number,
  viewportHeight: number,
  scrollHeight: number
): number {
  const centered = top + height / 2 - viewportHeight / 2
  const maxScrollTop = Math.max(0, scrollHeight - viewportHeight)

  return Math.max(0, Math.min(maxScrollTop, centered))
}

/**
 * Movement above this delta is animated; anything at or below it is applied
 * at once. `lineUnit` is one typographic line of the destination (the editor's
 * default line height, one row of the preview target).
 */
export function scrollThreshold(lineUnit: number, viewportHeight: number): number {
  return Math.max(lineUnit, viewportHeight / 6)
}

/**
 * Reads the OS/browser motion preference. A missing `matchMedia` (jsdom, very
 * old runtimes) must degrade to "motion allowed", never throw.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * True when the real `scrollTop` moved away from the value we wrote, i.e. the
 * user (wheel, scrollbar) owns the scroll now. The epsilon absorbs sub-pixel
 * quantisation and the integer rounding of `scrollHeight`/`clientHeight`.
 */
export function isForeignScroll(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) > SCROLL_EPSILON
}

/** The slice of the DOM the animator needs. Injected so tests need no layout. */
export interface Scroller {
  scrollTop: number
  clientHeight: number
  scrollHeight: number
}

/** Time and frame source. Injected so tests need no real clock or `rAF`. */
export interface FrameScheduler {
  now: () => number
  requestFrame: (callback: (time: number) => void) => number
  cancelFrame: (handle: number) => void
  reducedMotion: () => boolean
}

/**
 * Frame source of a real scroller: `performance.now`, the window's `rAF` and
 * the motion preference. Injected into the animator so a test can drive the
 * clock by hand.
 */
export function browserFrameScheduler(win: Window): FrameScheduler {
  return {
    now: () => win.performance.now(),
    requestFrame: (callback) => win.requestAnimationFrame(callback),
    cancelFrame: (handle) => win.cancelAnimationFrame(handle),
    reducedMotion: () => prefersReducedMotion()
  }
}

export interface ScrollRequestOptions {
  /** One typographic line of the destination, in CSS pixels. */
  lineUnit?: number
}

/**
 * `instant` wrote the destination right away; `animated` started a flight;
 * `ignored` had nothing to do (already there, or no viewport to scroll).
 */
export type ScrollOutcome = 'instant' | 'animated' | 'ignored'

export interface ScrollAnimator {
  request: (target: number, options?: ScrollRequestOptions) => ScrollOutcome
  cancel: (reason: string) => void
  isAnimating: () => boolean
}

export function createScrollAnimator(
  scroller: Scroller,
  scheduler: FrameScheduler
): ScrollAnimator {
  // Run token: every request or cancel bumps it, so a frame from a superseded
  // run can never write. One frame in flight at a time, no queue.
  let run = 0
  let frame: number | null = null

  function stop(): void {
    if (frame !== null) {
      scheduler.cancelFrame(frame)
      frame = null
    }

    run++
  }

  function request(target: number, options: ScrollRequestOptions = {}): ScrollOutcome {
    if (scroller.clientHeight <= 0) {
      stop()

      return 'ignored'
    }

    // Cancel before deciding: a retarget must never leave the old frame alive.
    stop()

    // Read the live position, not the last value we wrote: after a manual
    // gesture the written value is stale, and a retarget must start from where
    // the scroller actually is.
    const from = scroller.scrollTop
    const delta = target - from
    if (Math.abs(delta) < MIN_DELTA) return 'ignored'

    const threshold = scrollThreshold(options.lineUnit ?? 0, scroller.clientHeight)
    if (scheduler.reducedMotion() || Math.abs(delta) <= threshold) {
      scroller.scrollTop = target

      return 'instant'
    }

    const start = scheduler.now()
    const currentRun = run

    const step = (time: number): void => {
      if (currentRun !== run) return

      if (scroller.clientHeight <= 0) {
        stop()

        return
      }

      // The `rAF` timestamp is the frame start and can precede `start`, so the
      // first frame is clamped to `t = 0` instead of jumping backwards.
      const t = Math.min(1, Math.max(0, (time - start) / DURATION))
      if (t < 1) {
        scroller.scrollTop = from + delta * easeOutCubic(t)
        frame = scheduler.requestFrame(step)

        return
      }

      // Land on the computed destination, not on `from + delta`.
      scroller.scrollTop = target
      frame = null
    }

    frame = scheduler.requestFrame(step)

    return 'animated'
  }

  function cancel(reason: string): void {
    void reason
    stop()
  }

  return {
    request,
    cancel,
    isAnimating: () => frame !== null
  }
}
