import { EditorSelection, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { DURATION } from '../scroll/smooth-scroll'
import type { FrameScheduler, Scroller } from '../scroll/smooth-scroll'
import {
  computeCenterTarget,
  handleCenterScroll,
  TypewriterCentering,
  watchCancelSources,
  type ScrollHandlerOptions
} from './typewriter-animation'
import { typewriter } from './typewriter'

/** Manual clock: no timers and no rAF, so every frame is deterministic. */
function fakeScheduler(reducedMotion = false): FrameScheduler & {
  pending: () => number
  cancelledFrames: () => number[]
  advance: (ms: number) => void
} {
  let time = 0
  let nextHandle = 1
  const queue = new Map<number, (time: number) => void>()
  const cancelled: number[] = []

  return {
    now: () => time,
    requestFrame: (callback) => {
      const handle = nextHandle++
      queue.set(handle, callback)

      return handle
    },
    cancelFrame: (handle) => {
      cancelled.push(handle)
      queue.delete(handle)
    },
    reducedMotion: () => reducedMotion,
    pending: () => queue.size,
    cancelledFrames: () => cancelled,
    advance: (ms) => {
      time += ms
      const due = [...queue.values()]
      queue.clear()
      due.forEach((callback) => callback(time))
    }
  }
}

function fakeScroller(initial: Scroller): Scroller & { writes: () => number } {
  const state = { ...initial }
  let writes = 0

  return {
    get scrollTop() {
      return state.scrollTop
    },
    set scrollTop(value: number) {
      writes++
      state.scrollTop = value
    },
    get clientHeight() {
      return state.clientHeight
    },
    set clientHeight(value: number) {
      state.clientHeight = value
    },
    get scrollHeight() {
      return state.scrollHeight
    },
    set scrollHeight(value: number) {
      state.scrollHeight = value
    },
    writes: () => writes
  }
}

interface CenteringOptions {
  scrollTop?: number
  clientHeight?: number
  scrollHeight?: number
  paddingTop?: number
  lineHeight?: number
  block?: { top: number; height: number }
  reducedMotion?: boolean
}

/**
 * The geometry of the headless harness, without layout: a 700 px scroller, a
 * 24 px line, `padding-top: 122px` (338 minus the nine line caret offset) and
 * `scrollHeight: 3009` (100 lines).
 */
function mountCentering(options: CenteringOptions = {}): {
  centering: TypewriterCentering
  scroller: Scroller & { writes: () => number }
  scheduler: ReturnType<typeof fakeScheduler>
  measuredHeads: number[]
  setBlock: (block: { top: number; height: number }) => void
} {
  const scroller = fakeScroller({
    scrollTop: options.scrollTop ?? 0,
    clientHeight: options.clientHeight ?? 700,
    scrollHeight: options.scrollHeight ?? 3009
  })
  const scheduler = fakeScheduler(options.reducedMotion ?? false)
  const measuredHeads: number[] = []
  let block = options.block ?? { top: 0, height: 24 }

  const centering = new TypewriterCentering({
    scroller,
    scheduler,
    lineHeight: () => options.lineHeight ?? 24,
    measure: (head) => {
      measuredHeads.push(head)

      return { paddingTop: options.paddingTop ?? 122, block }
    }
  })

  return {
    centering,
    scroller,
    scheduler,
    measuredHeads,
    setBlock: (next) => {
      block = next
    }
  }
}

describe('computeCenterTarget', () => {
  it('centers the first line with the top padding alone', () => {
    expect(
      computeCenterTarget({
        paddingTop: 122,
        lineHeight: 24,
        block: { top: 0, height: 24 },
        viewportHeight: 700,
        scrollHeight: 3009
      })
    ).toBe(0)
  })

  it('centers a middle line on its block top', () => {
    expect(
      computeCenterTarget({
        paddingTop: 122,
        lineHeight: 24,
        block: { top: 1176, height: 24 },
        viewportHeight: 700,
        scrollHeight: 3009
      })
    ).toBe(1176)
  })

  it('centers the last line while leaving room below it', () => {
    expect(
      computeCenterTarget({
        paddingTop: 122,
        lineHeight: 24,
        block: { top: 2376, height: 24 },
        viewportHeight: 700,
        scrollHeight: 3509
      })
    ).toBe(2376)
  })

  it('never scrolls above the top of the document', () => {
    expect(
      computeCenterTarget({
        paddingTop: 122,
        lineHeight: 24,
        block: { top: -100, height: 24 },
        viewportHeight: 700,
        scrollHeight: 3009
      })
    ).toBe(0)
  })

  it('clamps to the last scrollable pixel', () => {
    expect(
      computeCenterTarget({
        paddingTop: 122,
        lineHeight: 24,
        block: { top: 2376, height: 24 },
        viewportHeight: 700,
        scrollHeight: 2430
      })
    ).toBe(1730)
  })

  it('centers the whole block of a wrapped line', () => {
    expect(
      computeCenterTarget({
        paddingTop: 122,
        lineHeight: 24,
        block: { top: 100, height: 72 },
        viewportHeight: 700,
        scrollHeight: 3009
      })
    ).toBe(124)
  })

  it('follows the padding the plugin actually wrote', () => {
    expect(
      computeCenterTarget({
        paddingTop: 0,
        lineHeight: 24,
        block: { top: 100, height: 72 },
        viewportHeight: 300,
        scrollHeight: 2034
      })
    ).toBe(202)
  })

  it('stays at the top when the document is shorter than the viewport', () => {
    expect(
      computeCenterTarget({
        paddingTop: 122,
        lineHeight: 24,
        block: { top: 0, height: 24 },
        viewportHeight: 700,
        scrollHeight: 430
      })
    ).toBe(0)
  })
})

describe('TypewriterCentering', () => {
  it('applies a one line adjustment at once', () => {
    const { centering, scroller, scheduler } = mountCentering({
      scrollTop: 1176,
      block: { top: 1200, height: 24 }
    })

    expect(centering.center(0)).toBe('instant')
    expect(scroller.scrollTop).toBe(1200)
    expect(scheduler.pending()).toBe(0)
  })

  it('treats a delta up to a sixth of the viewport as instant', () => {
    const { centering, scheduler } = mountCentering({ block: { top: 116, height: 24 } })

    expect(centering.center(0)).toBe('instant')
    expect(scheduler.pending()).toBe(0)
  })

  it('animates a delta above a sixth of the viewport', () => {
    const { centering, scroller, scheduler } = mountCentering({ block: { top: 117, height: 24 } })

    expect(centering.center(0)).toBe('animated')
    expect(scheduler.pending()).toBe(1)

    scheduler.advance(DURATION)

    expect(scroller.scrollTop).toBe(117)
  })

  it('falls back to a whole line in a very short viewport', () => {
    const { centering, scheduler } = mountCentering({
      clientHeight: 100,
      scrollHeight: 3009,
      block: { top: 30, height: 24 }
    })

    expect(centering.center(0)).toBe('animated')
    expect(scheduler.pending()).toBe(1)
  })

  it('animates a long jump and lands exactly on the destination', () => {
    const { centering, scroller, scheduler } = mountCentering({ block: { top: 1200, height: 24 } })

    expect(centering.center(0)).toBe('animated')

    scheduler.advance(0)
    expect(scroller.scrollTop).toBe(0)

    scheduler.advance(DURATION / 2)
    const midway = scroller.scrollTop
    expect(midway).toBeGreaterThan(0)
    expect(midway).toBeLessThan(1200)

    scheduler.advance(DURATION)
    expect(scroller.scrollTop).toBe(1200)
    expect(scheduler.pending()).toBe(0)
  })

  it('schedules no frame when the destination is already reached', () => {
    const { centering, scroller, scheduler } = mountCentering({
      scrollTop: 1200,
      block: { top: 1200, height: 24 }
    })

    expect(centering.center(0)).toBe('ignored')
    expect(scheduler.pending()).toBe(0)
    expect(scroller.writes()).toBe(0)
  })

  it('retargets mid flight from where the scroller is', () => {
    const { centering, scroller, scheduler, setBlock } = mountCentering({
      block: { top: 1200, height: 24 }
    })

    centering.center(0)
    scheduler.advance(60)
    const midway = scroller.scrollTop
    expect(midway).toBeGreaterThan(0)

    setBlock({ top: 0, height: 24 })
    expect(centering.center(0)).toBe('animated')

    expect(scheduler.cancelledFrames()).toHaveLength(1)
    expect(scheduler.pending()).toBe(1)

    scheduler.advance(0)
    expect(scroller.scrollTop).toBe(midway)

    scheduler.advance(DURATION)
    expect(scroller.scrollTop).toBe(0)
  })

  it('stops the flight where it is when the scroll is taken away', () => {
    const { centering, scroller, scheduler } = mountCentering({ block: { top: 1200, height: 24 } })

    centering.center(0)
    scheduler.advance(60)
    const midway = scroller.scrollTop

    centering.cancel('wheel')

    expect(scheduler.pending()).toBe(0)

    scheduler.advance(500)
    expect(scroller.scrollTop).toBe(midway)
  })

  it('writes the destination without a frame when motion is reduced', () => {
    const { centering, scroller, scheduler } = mountCentering({
      block: { top: 1200, height: 24 },
      reducedMotion: true
    })

    expect(centering.center(0)).toBe('instant')
    expect(scroller.scrollTop).toBe(1200)
    expect(scheduler.pending()).toBe(0)
  })

  it('measures the caret block once per request, not once per frame', () => {
    const { centering, scheduler, measuredHeads } = mountCentering({
      block: { top: 1200, height: 24 }
    })

    centering.center(7)
    for (let tick = 0; tick < 12; tick++) scheduler.advance(16)

    expect(measuredHeads).toEqual([7])
  })

  it('leaves a hidden scroller alone', () => {
    const { centering, scroller, scheduler } = mountCentering({ clientHeight: 0 })

    expect(centering.center(0)).toBe('ignored')
    expect(scroller.writes()).toBe(0)
    expect(scheduler.pending()).toBe(0)
  })
})

describe('watchCancelSources', () => {
  function setup(): {
    scroller: HTMLElement
    cancel: ReturnType<typeof jest.fn>
    unwatch: () => void
  } {
    const scroller = document.createElement('div')
    document.body.appendChild(scroller)
    const cancel = jest.fn()
    const unwatch = watchCancelSources({ scroller, win: window, cancel })

    return { scroller, cancel, unwatch }
  }

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('cancels on a wheel over the scroller', () => {
    const { scroller, cancel, unwatch } = setup()

    scroller.dispatchEvent(new Event('wheel'))

    expect(cancel).toHaveBeenCalledWith('wheel')
    unwatch()
  })

  it('cancels on a touch that starts on the scroller', () => {
    const { scroller, cancel, unwatch } = setup()

    scroller.dispatchEvent(new Event('touchstart'))

    expect(cancel).toHaveBeenCalledWith('touchstart')
    unwatch()
  })

  it('cancels when a pointer or a mouse button goes down on the scroller', () => {
    const { scroller, cancel, unwatch } = setup()

    scroller.dispatchEvent(new Event('pointerdown'))
    scroller.dispatchEvent(new Event('mousedown'))

    expect(cancel).toHaveBeenNthCalledWith(1, 'pointerdown')
    expect(cancel).toHaveBeenNthCalledWith(2, 'mousedown')
    unwatch()
  })

  it('cancels on a window resize', () => {
    const { cancel, unwatch } = setup()

    window.dispatchEvent(new Event('resize'))

    expect(cancel).toHaveBeenCalledWith('resize')
    unwatch()
  })

  it('leaves no listener behind after the cleanup', () => {
    const { scroller, cancel, unwatch } = setup()

    unwatch()

    scroller.dispatchEvent(new Event('wheel'))
    scroller.dispatchEvent(new Event('touchstart'))
    scroller.dispatchEvent(new Event('pointerdown'))
    scroller.dispatchEvent(new Event('mousedown'))
    window.dispatchEvent(new Event('resize'))

    expect(cancel).not.toHaveBeenCalled()
  })
})

/**
 * jsdom lays nothing out, so these tests only assert the wiring that is
 * observable without geometry. Real frames belong to the headless harness.
 */
const mounted: EditorView[] = []

function mountEditor(): { view: EditorView; updates: () => number } {
  const parent = document.createElement('div')
  document.body.appendChild(parent)

  let updates = 0
  const view = new EditorView({
    state: EditorState.create({
      doc: 'one\ntwo',
      extensions: [
        typewriter,
        EditorView.updateListener.of(() => {
          updates++
        })
      ]
    }),
    parent
  })

  mounted.push(view)

  return { view, updates: () => updates }
}

type ScrollHandler = typeof handleCenterScroll

function scrollHandlerOf(view: EditorView): ScrollHandler {
  const [handler] = view.state.facet(EditorView.scrollHandler)

  return handler as ScrollHandler
}

interface StubAnimation {
  centerCaret: (head: number) => void
  cancel: (reason: string) => void
}

/** The handler only uses `view.plugin`, so the rest of the view is irrelevant. */
function stubView(animation: StubAnimation | null): EditorView {
  return { plugin: () => animation } as unknown as EditorView
}

function scrollOptions(
  y: 'center' | 'start',
  x: 'nearest' | 'center' = 'nearest'
): ScrollHandlerOptions {
  return { x, y, xMargin: 5, yMargin: 5 }
}

describe('handleCenterScroll', () => {
  it('centers the caret and swallows the native scroll for a center target', () => {
    const centerCaret = jest.fn()
    const cancel = jest.fn()

    const handled = handleCenterScroll(
      stubView({ centerCaret, cancel }),
      EditorSelection.cursor(4),
      scrollOptions('center')
    )

    expect(handled).toBe(true)
    expect(centerCaret).toHaveBeenCalledWith(4)
    expect(cancel).not.toHaveBeenCalled()
  })

  it('cancels the flight and keeps the native scroll for any other target', () => {
    const centerCaret = jest.fn()
    const cancel = jest.fn()
    const view = stubView({ centerCaret, cancel })

    expect(handleCenterScroll(view, EditorSelection.cursor(4), scrollOptions('start'))).toBe(false)
    expect(
      handleCenterScroll(view, EditorSelection.cursor(4), scrollOptions('center', 'center'))
    ).toBe(false)

    expect(centerCaret).not.toHaveBeenCalled()
    expect(cancel).toHaveBeenCalledTimes(2)
    expect(cancel).toHaveBeenCalledWith('native scroll')
  })

  it('falls back to the native scroll when the plugin is not there', () => {
    const handled = handleCenterScroll(
      stubView(null),
      EditorSelection.cursor(4),
      scrollOptions('center')
    )

    expect(handled).toBe(false)
  })
})

describe('typewriterAnimation', () => {
  afterEach(() => {
    for (const view of mounted.splice(0)) view.destroy()
    document.body.innerHTML = ''
  })

  it('forces scroll-behavior to auto so native smoothing cannot fight the frames', () => {
    const { view } = mountEditor()

    expect(view.scrollDOM.style.scrollBehavior).toBe('auto')
  })

  it('takes over a center target and leaves any other target to CodeMirror', () => {
    const { view } = mountEditor()
    const handler = scrollHandlerOf(view)
    const range = EditorSelection.cursor(4)

    expect(handler(view, range, { x: 'nearest', y: 'center', xMargin: 5, yMargin: 5 })).toBe(true)
    expect(handler(view, range, { x: 'nearest', y: 'start', xMargin: 5, yMargin: 5 })).toBe(false)
  })

  it('does not dispatch a transaction from the scroll handler', () => {
    const { view, updates } = mountEditor()
    const handler = scrollHandlerOf(view)
    const before = updates()

    handler(view, EditorSelection.cursor(4), { x: 'nearest', y: 'center', xMargin: 5, yMargin: 5 })

    expect(updates()).toBe(before)
  })
})
