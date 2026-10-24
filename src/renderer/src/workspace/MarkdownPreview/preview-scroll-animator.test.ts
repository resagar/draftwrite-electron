import { describe, expect, it, jest } from '@jest/globals'
import { DURATION } from '../../scroll/smooth-scroll'
import type { FrameScheduler } from '../../scroll/smooth-scroll'
import { createPreviewScrollAnimator } from './preview-scroll-animator'

/** Manual clock: frames only run when the test advances the time. */
function fakeScheduler(reducedMotion = false): FrameScheduler & {
  pending: () => number
  cancelledFrames: () => number
  advance: (ms: number) => void
} {
  let time = 0
  let nextHandle = 1
  const queue = new Map<number, (time: number) => void>()
  let cancelled = 0

  return {
    now: () => time,
    requestFrame: (callback: (time: number) => void) => {
      const handle = nextHandle++
      queue.set(handle, callback)

      return handle
    },
    cancelFrame: (handle: number) => {
      cancelled += 1
      queue.delete(handle)
    },
    reducedMotion: () => reducedMotion,
    pending: () => queue.size,
    cancelledFrames: () => cancelled,
    advance: (ms: number) => {
      time += ms
      const due = [...queue.values()]
      queue.clear()
      due.forEach((callback) => callback(time))
    }
  }
}

/** jsdom has no layout: the three numbers the scroller needs are stubbed. */
type FakeContainer = HTMLElement & {
  readonly scrollable: { scrollTop: number; clientHeight: number; scrollHeight: number }
}

function fakeContainer(
  initial: { scrollTop?: number; clientHeight?: number; scrollHeight?: number } = {}
): FakeContainer {
  const state = {
    scrollTop: initial.scrollTop ?? 0,
    clientHeight: initial.clientHeight ?? 430,
    scrollHeight: initial.scrollHeight ?? 3009
  }
  const element = document.createElement('section') as FakeContainer

  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    get: () => state.scrollTop,
    set: (value: number) => {
      state.scrollTop = value
    }
  })
  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    get: () => state.clientHeight
  })
  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    get: () => state.scrollHeight
  })
  Object.defineProperty(element, 'scrollable', { configurable: true, value: state })

  document.body.append(element)

  return element
}

const LINE_UNIT = 22

describe('createPreviewScrollAnimator', () => {
  it('writes a layout sync at once, however large the jump', () => {
    const container = fakeContainer({ clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createPreviewScrollAnimator({ container, scheduler })

    expect(animator.scrollTo(1200, 'layout', LINE_UNIT)).toBe('instant')
    expect(container.scrollTop).toBe(1200)
    expect(scheduler.pending()).toBe(0)
    expect(animator.isAnimating()).toBe(false)

    animator.destroy()
  })

  it('animates a large caret jump and lands exactly on the destination', () => {
    const container = fakeContainer({ clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createPreviewScrollAnimator({ container, scheduler })

    expect(animator.scrollTo(2324, 'caret', LINE_UNIT)).toBe('animated')
    expect(animator.isAnimating()).toBe(true)
    expect(container.scrollTop).toBe(0)
    expect(scheduler.pending()).toBe(1)

    scheduler.advance(DURATION)

    expect(container.scrollTop).toBe(2324)
    expect(animator.isAnimating()).toBe(false)

    animator.destroy()
  })

  it('writes a one line caret adjustment at once', () => {
    const container = fakeContainer({ scrollTop: 1176, clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createPreviewScrollAnimator({ container, scheduler })

    expect(animator.scrollTo(1200, 'caret', LINE_UNIT)).toBe('instant')
    expect(container.scrollTop).toBe(1200)
    expect(scheduler.pending()).toBe(0)

    animator.destroy()
  })

  it('schedules no frame when motion is reduced', () => {
    const container = fakeContainer({ clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler(true)
    const animator = createPreviewScrollAnimator({ container, scheduler })

    expect(animator.scrollTo(2324, 'caret', LINE_UNIT)).toBe('instant')
    expect(container.scrollTop).toBe(2324)
    expect(scheduler.pending()).toBe(0)

    animator.destroy()
  })

  it('keeps one animator per scroller and reports the reason of the last write', () => {
    const container = fakeContainer({ scrollTop: 400, clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createPreviewScrollAnimator({ container, scheduler })

    // A layout sync must also correct a flight started by the caret.
    animator.scrollTo(2400, 'caret', LINE_UNIT)
    expect(animator.isAnimating()).toBe(true)

    animator.scrollTo(900, 'layout', LINE_UNIT)

    expect(animator.isAnimating()).toBe(false)
    expect(scheduler.pending()).toBe(0)
    expect(container.scrollTop).toBe(900)

    animator.destroy()
  })
})

describe('createPreviewScrollAnimator cancellation', () => {
  const GESTURES = ['wheel', 'touchstart', 'pointerdown', 'mousedown'] as const

  it.each(GESTURES)('stops the flight on %s and leaves the scroll to the user', (type) => {
    const container = fakeContainer({ clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createPreviewScrollAnimator({ container, scheduler })

    animator.scrollTo(2400, 'caret', LINE_UNIT)
    scheduler.advance(60)
    const midway = container.scrollTop

    container.dispatchEvent(new Event(type))

    expect(animator.isAnimating()).toBe(false)
    expect(scheduler.pending()).toBe(0)

    scheduler.advance(DURATION)

    expect(container.scrollTop).toBe(midway)

    animator.destroy()
  })

  it('stops the flight on a window resize', () => {
    const container = fakeContainer({ clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createPreviewScrollAnimator({ container, scheduler })

    animator.scrollTo(2400, 'caret', LINE_UNIT)
    scheduler.advance(60)
    const midway = container.scrollTop

    window.dispatchEvent(new Event('resize'))

    expect(animator.isAnimating()).toBe(false)

    scheduler.advance(DURATION)

    expect(container.scrollTop).toBe(midway)

    animator.destroy()
  })

  it('animates again after a gesture cancelled the previous flight', () => {
    const container = fakeContainer({ clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createPreviewScrollAnimator({ container, scheduler })

    animator.scrollTo(2400, 'caret', LINE_UNIT)
    container.dispatchEvent(new Event('wheel'))
    animator.scrollTo(1800, 'caret', LINE_UNIT)
    scheduler.advance(DURATION)

    expect(container.scrollTop).toBe(1800)

    animator.destroy()
  })

  it('removes every listener it added, and stops the flight, on destroy', () => {
    const container = fakeContainer({ clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const containerAdded = jest.spyOn(container, 'addEventListener')
    const containerRemoved = jest.spyOn(container, 'removeEventListener')
    const windowAdded = jest.spyOn(window, 'addEventListener')
    const windowRemoved = jest.spyOn(window, 'removeEventListener')

    try {
      const animator = createPreviewScrollAnimator({ container, scheduler })

      animator.scrollTo(2400, 'caret', LINE_UNIT)
      animator.destroy()

      expect(animator.isAnimating()).toBe(false)
      expect(scheduler.pending()).toBe(0)
      expect(containerRemoved.mock.calls.map((call) => call[0])).toEqual(
        containerAdded.mock.calls.map((call) => call[0])
      )
      expect(windowRemoved.mock.calls.map((call) => call[0])).toEqual(
        windowAdded.mock.calls.map((call) => call[0])
      )
      expect(containerAdded).toHaveBeenCalledTimes(5)
    } finally {
      containerAdded.mockRestore()
      containerRemoved.mockRestore()
      windowAdded.mockRestore()
      windowRemoved.mockRestore()
    }
  })
})

describe('createPreviewScrollAnimator scrollbar guard', () => {
  it('keeps flying through the scroll events our own writes cause', () => {
    const container = fakeContainer({ clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createPreviewScrollAnimator({ container, scheduler })

    animator.scrollTo(2400, 'caret', LINE_UNIT)
    scheduler.advance(60)
    // The browser emits `scroll` for the frame we just wrote.
    container.dispatchEvent(new Event('scroll'))

    expect(animator.isAnimating()).toBe(true)

    scheduler.advance(DURATION)

    expect(container.scrollTop).toBe(2400)

    animator.destroy()
  })

  it('cancels when the scroller moves away from the value we wrote', () => {
    const container = fakeContainer({ clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createPreviewScrollAnimator({ container, scheduler })

    animator.scrollTo(2400, 'caret', LINE_UNIT)
    scheduler.advance(60)
    const written = container.scrollTop

    // A scrollbar drag: the user moved the thumb 40 px away from our last write.
    container.scrollable.scrollTop = written + 40
    container.dispatchEvent(new Event('scroll'))

    expect(animator.isAnimating()).toBe(false)
    expect(scheduler.pending()).toBe(0)

    scheduler.advance(DURATION)

    expect(container.scrollTop).toBe(written + 40)

    animator.destroy()
  })

  it('tolerates a deviation inside the epsilon', () => {
    const container = fakeContainer({ clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createPreviewScrollAnimator({ container, scheduler })

    animator.scrollTo(2400, 'caret', LINE_UNIT)
    scheduler.advance(60)

    container.scrollable.scrollTop = container.scrollTop + 2
    container.dispatchEvent(new Event('scroll'))

    expect(animator.isAnimating()).toBe(true)

    animator.destroy()
  })

  it('does not cancel when the live maximum shrank under the flight', () => {
    const container = fakeContainer({ scrollHeight: 3009, clientHeight: 430 })
    const scheduler = fakeScheduler()
    const animator = createPreviewScrollAnimator({ container, scheduler })

    animator.scrollTo(2400, 'caret', LINE_UNIT)
    scheduler.advance(60)

    // Spacers rewritten mid-flight: the maximum scroll is now below what we
    // wrote, so the browser clamps `scrollTop` by itself.
    container.scrollable.scrollHeight = 500
    container.scrollable.scrollTop = 70
    container.dispatchEvent(new Event('scroll'))

    expect(animator.isAnimating()).toBe(true)

    animator.destroy()
  })

  it('ignores every scroll while no flight is running', () => {
    const container = fakeContainer({ clientHeight: 430, scrollHeight: 3009 })
    const scheduler = fakeScheduler()
    const animator = createPreviewScrollAnimator({ container, scheduler })

    animator.scrollTo(600, 'layout', LINE_UNIT)
    container.scrollable.scrollTop = 0
    container.dispatchEvent(new Event('scroll'))

    expect(scheduler.cancelledFrames()).toBe(0)

    // The next caret event still animates: the guard never touched the animator.
    expect(animator.scrollTo(2400, 'caret', LINE_UNIT)).toBe('animated')

    animator.destroy()
  })
})
