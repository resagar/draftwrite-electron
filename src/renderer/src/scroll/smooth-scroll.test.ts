import { afterEach, describe, expect, it, jest } from '@jest/globals'
import {
  browserFrameScheduler,
  centerOffset,
  createScrollAnimator,
  DURATION,
  easeOutCubic,
  isForeignScroll,
  prefersReducedMotion,
  scrollThreshold
} from './smooth-scroll'
import type { FrameScheduler, Scroller } from './smooth-scroll'

type MatchMediaStub = ((query: string) => { matches: boolean }) | undefined

/** Manual clock: no timers and no rAF, so every frame is deterministic. */
function fakeScheduler(reducedMotion = false): FrameScheduler & {
  pending: () => number
  pendingHandles: () => number[]
  cancelledFrames: () => number[]
  invokeStaleFrame: (handle: number) => void
  advance: (ms: number) => void
} {
  let time = 0
  let nextHandle = 1
  const queue = new Map<number, (time: number) => void>()
  const issued = new Map<number, (time: number) => void>()
  const cancelled: number[] = []

  return {
    now: () => time,
    requestFrame: (callback: (time: number) => void) => {
      const handle = nextHandle++
      queue.set(handle, callback)
      issued.set(handle, callback)

      return handle
    },
    cancelFrame: (handle: number) => {
      cancelled.push(handle)
      queue.delete(handle)
    },
    reducedMotion: () => reducedMotion,
    pending: () => queue.size,
    pendingHandles: () => [...queue.keys()],
    cancelledFrames: () => cancelled,
    // Replays a frame the animator has already superseded or cancelled.
    invokeStaleFrame: (handle: number) => {
      issued.get(handle)?.(time)
    },
    advance: (ms: number) => {
      time += ms
      const due = [...queue.values()]
      queue.clear()
      due.forEach((callback) => callback(time))
    }
  }
}

/** Scroller that records every write, so "we only touch scrollTop" is checkable. */
function fakeScroller(
  initial: Scroller
): Scroller & { writes: { scrollTop: number; clientHeight: number; scrollHeight: number } } {
  const state = { ...initial }
  const writes = { scrollTop: 0, clientHeight: 0, scrollHeight: 0 }

  return {
    get scrollTop() {
      return state.scrollTop
    },
    set scrollTop(value: number) {
      writes.scrollTop++
      state.scrollTop = value
    },
    get clientHeight() {
      return state.clientHeight
    },
    set clientHeight(value: number) {
      writes.clientHeight++
      state.clientHeight = value
    },
    get scrollHeight() {
      return state.scrollHeight
    },
    set scrollHeight(value: number) {
      writes.scrollHeight++
      state.scrollHeight = value
    },
    writes
  }
}

function stubMatchMedia(impl: MatchMediaStub): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: impl
  })
}

describe('easeOutCubic', () => {
  it('starts at 0 and ends at 1', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
  })

  it('front-loads the movement', () => {
    expect(easeOutCubic(0.5)).toBe(0.875)
  })

  it('grows monotonically', () => {
    const samples = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]
    const eased = samples.map(easeOutCubic)

    eased.forEach((value, index) => {
      if (index > 0) expect(value).toBeGreaterThan(eased[index - 1])
    })
  })
})

describe('centerOffset', () => {
  it('puts the middle of the span in the middle of the viewport', () => {
    expect(centerOffset(1000, 100, 500, 6000)).toBe(800)
  })

  it('clamps to the top of the document', () => {
    expect(centerOffset(40, 100, 500, 6000)).toBe(0)
    expect(centerOffset(-300, 100, 500, 6000)).toBe(0)
  })

  it('clamps to the last scrollable pixel', () => {
    expect(centerOffset(5000, 100, 500, 2500)).toBe(2000)
  })

  it('stays at the top when the content is shorter than the viewport', () => {
    expect(centerOffset(0, 100, 500, 400)).toBe(0)
  })
})

describe('scrollThreshold', () => {
  it('uses a sixth of the viewport when it dominates the line unit', () => {
    expect(scrollThreshold(21.125, 700)).toBeCloseTo(700 / 6, 10)
  })

  it('keeps one line of movement animating in very short viewports', () => {
    expect(scrollThreshold(21.125, 100)).toBe(21.125)
  })

  it('never drops below the line unit', () => {
    expect(scrollThreshold(22, 0)).toBe(22)
  })
})

describe('isForeignScroll', () => {
  it('accepts drift within the epsilon', () => {
    expect(isForeignScroll(100, 101)).toBe(false)
    expect(isForeignScroll(100, 102)).toBe(false)
  })

  it('flags a clear deviation', () => {
    expect(isForeignScroll(100, 105)).toBe(true)
    expect(isForeignScroll(100, 60)).toBe(true)
  })
})

describe('prefersReducedMotion', () => {
  afterEach(() => {
    stubMatchMedia(undefined)
  })

  it('returns false instead of throwing when matchMedia is unavailable', () => {
    stubMatchMedia(undefined)

    expect(prefersReducedMotion()).toBe(false)
  })

  it('reports the reduce preference', () => {
    stubMatchMedia((query) => ({ matches: query === '(prefers-reduced-motion: reduce)' }))

    expect(prefersReducedMotion()).toBe(true)
  })

  it('returns false when the user allows motion', () => {
    stubMatchMedia(() => ({ matches: false }))

    expect(prefersReducedMotion()).toBe(false)
  })
})

describe('browserFrameScheduler', () => {
  it('reads the clock and frames of the window it is given', () => {
    const requested: ((time: number) => void)[] = []
    const cancelled: number[] = []
    const win = {
      performance: { now: () => 123.5 },
      requestAnimationFrame: (callback: (time: number) => void): number => {
        requested.push(callback)

        return 7
      },
      cancelAnimationFrame: (handle: number): void => {
        cancelled.push(handle)
      }
    } as unknown as Window
    const scheduler = browserFrameScheduler(win)
    const step = (): void => undefined

    expect(scheduler.now()).toBe(123.5)
    expect(scheduler.requestFrame(step)).toBe(7)
    expect(requested).toEqual([step])

    scheduler.cancelFrame(7)

    expect(cancelled).toEqual([7])
  })

  it('reports the motion preference of the environment', () => {
    stubMatchMedia(() => ({ matches: true }))

    expect(browserFrameScheduler(window).reducedMotion()).toBe(true)

    stubMatchMedia(() => ({ matches: false }))

    expect(browserFrameScheduler(window).reducedMotion()).toBe(false)
  })
})

describe('createScrollAnimator', () => {
  it('applies a small adjustment at once, without scheduling frames', () => {
    const scroller = fakeScroller({ scrollTop: 1176, clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createScrollAnimator(scroller, scheduler)

    animator.request(1200, { lineUnit: 24 })

    expect(scroller.scrollTop).toBe(1200)
    expect(scheduler.pending()).toBe(0)
    expect(animator.isAnimating()).toBe(false)
  })

  it('animates a large jump and lands exactly on the destination', () => {
    const scroller = fakeScroller({ scrollTop: 0, clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createScrollAnimator(scroller, scheduler)

    animator.request(1200, { lineUnit: 24 })

    expect(animator.isAnimating()).toBe(true)
    expect(scheduler.pending()).toBe(1)
    expect(scroller.scrollTop).toBe(0)

    // The frame timestamp is the frame start and may precede the request.
    scheduler.advance(0)

    expect(scroller.scrollTop).toBe(0)
    expect(animator.isAnimating()).toBe(true)

    scheduler.advance(DURATION)

    expect(scroller.scrollTop).toBe(1200)
    expect(scheduler.pending()).toBe(0)
    expect(animator.isAnimating()).toBe(false)
  })

  it('moves monotonically towards the destination without overshooting', () => {
    const scroller = fakeScroller({ scrollTop: 0, clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createScrollAnimator(scroller, scheduler)

    animator.request(1200, { lineUnit: 24 })

    const samples: number[] = []
    for (let tick = 0; tick < 12; tick++) {
      scheduler.advance(16)
      samples.push(scroller.scrollTop)
    }

    expect(samples[0]).toBeGreaterThan(0)
    samples.forEach((sample, index) => {
      expect(sample).toBeLessThanOrEqual(1200)
      if (index > 0) expect(sample).toBeGreaterThanOrEqual(samples[index - 1])
    })
    expect(scroller.scrollTop).toBe(1200)
  })

  it('retargets mid-flight from the current position', () => {
    const scroller = fakeScroller({ scrollTop: 0, clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createScrollAnimator(scroller, scheduler)

    animator.request(1200, { lineUnit: 24 })
    scheduler.advance(60)
    const midway = scroller.scrollTop

    expect(midway).toBeGreaterThan(0)
    expect(midway).toBeLessThan(1200)

    animator.request(0, { lineUnit: 24 })

    expect(scheduler.cancelledFrames()).toHaveLength(1)
    expect(scheduler.pending()).toBe(1)

    scheduler.advance(0)
    expect(scroller.scrollTop).toBe(midway)

    scheduler.advance(DURATION)
    expect(scroller.scrollTop).toBe(0)
    expect(animator.isAnimating()).toBe(false)
  })

  it('never writes from a frame of a superseded run', () => {
    const scroller = fakeScroller({ scrollTop: 0, clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createScrollAnimator(scroller, scheduler)

    animator.request(1200, { lineUnit: 24 })
    scheduler.advance(60)
    const supersededFrame = scheduler.pendingHandles()[0]

    animator.request(0, { lineUnit: 24 })
    scheduler.advance(0)
    const afterRetarget = scroller.scrollTop

    scheduler.invokeStaleFrame(supersededFrame)

    expect(scroller.scrollTop).toBe(afterRetarget)
  })

  it('keeps a single frame alive across a burst of requests', () => {
    const scroller = fakeScroller({ scrollTop: 0, clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createScrollAnimator(scroller, scheduler)

    animator.request(1200, { lineUnit: 24 })
    animator.request(800, { lineUnit: 24 })
    animator.request(2400, { lineUnit: 24 })

    expect(scheduler.pending()).toBe(1)

    scheduler.advance(DURATION)

    expect(scroller.scrollTop).toBe(2400)
  })

  it('stops the flight where it is when cancelled', () => {
    const scroller = fakeScroller({ scrollTop: 0, clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createScrollAnimator(scroller, scheduler)

    animator.request(1200, { lineUnit: 24 })
    scheduler.advance(60)
    const midway = scroller.scrollTop

    animator.cancel('wheel')

    expect(animator.isAnimating()).toBe(false)
    expect(scheduler.pending()).toBe(0)

    scheduler.advance(500)

    expect(scroller.scrollTop).toBe(midway)
  })

  it('can animate again after a cancel', () => {
    const scroller = fakeScroller({ scrollTop: 0, clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createScrollAnimator(scroller, scheduler)

    animator.request(1200, { lineUnit: 24 })
    scheduler.advance(60)
    animator.cancel('wheel')

    animator.request(2400, { lineUnit: 24 })

    expect(animator.isAnimating()).toBe(true)
    expect(scheduler.pending()).toBe(1)

    scheduler.advance(DURATION)

    expect(scroller.scrollTop).toBe(2400)
  })

  it('applies the destination at once when motion is reduced', () => {
    const scroller = fakeScroller({ scrollTop: 0, clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler(true)
    const animator = createScrollAnimator(scroller, scheduler)

    expect(animator.request(1200, { lineUnit: 24 })).toBe('instant')
    expect(scroller.scrollTop).toBe(1200)
    expect(scheduler.pending()).toBe(0)
    expect(animator.isAnimating()).toBe(false)
  })

  it('does not touch a hidden scroller', () => {
    const scroller = fakeScroller({ scrollTop: 400, clientHeight: 0, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createScrollAnimator(scroller, scheduler)

    expect(animator.request(1200, { lineUnit: 24 })).toBe('ignored')
    expect(scroller.scrollTop).toBe(400)
    expect(scroller.writes.scrollTop).toBe(0)
    expect(scheduler.pending()).toBe(0)
  })

  it('stops a flight when the scroller becomes hidden', () => {
    const scroller = fakeScroller({ scrollTop: 0, clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createScrollAnimator(scroller, scheduler)

    animator.request(1200, { lineUnit: 24 })
    scheduler.advance(60)
    const midway = scroller.scrollTop

    scroller.clientHeight = 0
    scheduler.advance(60)

    expect(animator.isAnimating()).toBe(false)
    expect(scheduler.pending()).toBe(0)
    expect(scroller.scrollTop).toBe(midway)
  })

  it('does nothing when the target is already reached', () => {
    const scroller = fakeScroller({ scrollTop: 1200, clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createScrollAnimator(scroller, scheduler)

    expect(animator.request(1200, { lineUnit: 24 })).toBe('ignored')
    expect(scroller.writes.scrollTop).toBe(0)
    expect(scheduler.pending()).toBe(0)
  })

  it('applies a delta equal to the threshold at once', () => {
    const scroller = fakeScroller({ scrollTop: 0, clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createScrollAnimator(scroller, scheduler)

    expect(animator.request(100, { lineUnit: 100 })).toBe('instant')
    expect(scroller.scrollTop).toBe(100)
    expect(scheduler.pending()).toBe(0)
  })

  it('falls back to a sixth of the viewport without a line unit', () => {
    const scroller = fakeScroller({ scrollTop: 0, clientHeight: 600, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createScrollAnimator(scroller, scheduler)

    expect(animator.request(96)).toBe('instant')
    expect(scroller.scrollTop).toBe(96)
    expect(animator.request(400)).toBe('animated')
    expect(animator.isAnimating()).toBe(true)
  })

  it('writes only scrollTop and registers no listeners', () => {
    const addEventListener = jest.spyOn(globalThis, 'addEventListener')

    try {
      const scroller = fakeScroller({ scrollTop: 0, clientHeight: 430, scrollHeight: 3009 })
      const scheduler = fakeScheduler()
      const animator = createScrollAnimator(scroller, scheduler)

      animator.request(1200, { lineUnit: 24 })
      for (let tick = 0; tick < 12; tick++) scheduler.advance(16)
      animator.cancel('done')

      expect(scroller.scrollTop).toBe(1200)
      expect(scroller.writes.clientHeight).toBe(0)
      expect(scroller.writes.scrollHeight).toBe(0)
      expect(addEventListener).not.toHaveBeenCalled()
    } finally {
      addEventListener.mockRestore()
    }
  })
})
