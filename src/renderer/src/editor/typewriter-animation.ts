/**
 * Animation layer of the typewriter scroll.
 *
 * CodeMirror resolves every scroll effect through `EditorView.scrollHandler`
 * before it measures or writes `scrollTop`. Taking over the
 * `{ y: 'center', x: 'nearest' }` targets there is what makes the large caret
 * jumps animatable: the native `"nearest"` jump never happens, the target is
 * computed once from `lineBlockAt` and the flight is a plain `requestAnimationFrame`
 * loop that only writes `scrollTop`.
 */
import type { SelectionRange } from '@codemirror/state'
import { EditorView, ViewPlugin, type PluginValue, type ViewUpdate } from '@codemirror/view'
import {
  createScrollAnimator,
  prefersReducedMotion,
  type FrameScheduler,
  type ScrollAnimator,
  type Scroller,
  type ScrollOutcome
} from '../scroll/smooth-scroll'

/** Same values as CodeMirror's internal `ScrollStrategy`, which it does not export. */
type ScrollStrategy = 'nearest' | 'start' | 'end' | 'center'

/** The options CodeMirror passes to the `scrollHandler` facet. */
export interface ScrollHandlerOptions {
  x: ScrollStrategy
  y: ScrollStrategy
  xMargin: number
  yMargin: number
}

export interface LineBlock {
  /** Top of the block relative to the start of the document. */
  top: number
  height: number
}

/** Where the caret is, without the viewport: `documentPadding.top` plus a line block. */
export interface CaretGeometry {
  paddingTop: number
  block: LineBlock
}

export interface CenterGeometry extends CaretGeometry {
  viewportHeight: number
  scrollHeight: number
}

/**
 * The `scrollTop` that leaves `block` vertically centered, clamped to the
 * scrollable range.
 *
 * The padding belongs to the formula: the typewriter padding is what lets the
 * first line be centered at `scrollTop = 0` and the last one while there is
 * still room below it. With `paddingTop = (H - L) / 2` and a one line block
 * the result is the top of the block itself.
 */
export function computeCenterTarget(geometry: CenterGeometry): number {
  const { paddingTop, block, viewportHeight, scrollHeight } = geometry
  const maxScrollTop = Math.max(0, scrollHeight - viewportHeight)
  const centered = paddingTop + block.top + block.height / 2 - viewportHeight / 2

  return Math.max(0, Math.min(maxScrollTop, centered))
}

export interface TypewriterCenteringDeps {
  scroller: Scroller
  scheduler: FrameScheduler
  /** Height of one typographic line: the floor of the animation threshold. */
  lineHeight: () => number
  /** Reads where `head` is. Called once per request, never per frame. */
  measure: (head: number) => CaretGeometry
}

/**
 * Keeps the caret centered. Small corrections are written at once; only jumps
 * above `max(lineHeight, clientHeight / 6)` start a flight, and a new request
 * retargets the running one from the live `scrollTop` instead of queueing.
 */
export class TypewriterCentering {
  private readonly animator: ScrollAnimator

  constructor(private readonly deps: TypewriterCenteringDeps) {
    this.animator = createScrollAnimator(deps.scroller, deps.scheduler)
  }

  center(head: number): ScrollOutcome {
    const { paddingTop, block } = this.deps.measure(head)

    return this.animator.request(
      computeCenterTarget({
        paddingTop,
        block,
        viewportHeight: this.deps.scroller.clientHeight,
        scrollHeight: this.deps.scroller.scrollHeight
      }),
      // The animator thresholds on `max(lineUnit, clientHeight / 6)`: one line
      // is the floor, so a one or two line adjustment is written at once.
      { lineUnit: this.deps.lineHeight() }
    )
  }

  cancel(reason: string): void {
    this.animator.cancel(reason)
  }
}

/** Frame source of the real scroller: `performance.now` and the window's `rAF`. */
export function browserFrameScheduler(win: Window): FrameScheduler {
  return {
    now: () => win.performance.now(),
    requestFrame: (callback) => win.requestAnimationFrame(callback),
    cancelFrame: (handle) => win.cancelAnimationFrame(handle),
    reducedMotion: () => prefersReducedMotion()
  }
}

export interface CancelSources {
  scroller: HTMLElement
  win: Window
  cancel: (reason: string) => void
}

/**
 * Cancels the flight as soon as something else takes the scroll away: the
 * wheel, a touch, a pointer or mouse button on the scroller (that includes the
 * scrollbar), or a resize. Returns the cleanup that removes every listener.
 */
export function watchCancelSources({ scroller, win, cancel }: CancelSources): () => void {
  const onWheel = (): void => cancel('wheel')
  const onTouchStart = (): void => cancel('touchstart')
  const onPointerDown = (): void => cancel('pointerdown')
  const onMouseDown = (): void => cancel('mousedown')
  const onResize = (): void => cancel('resize')

  scroller.addEventListener('wheel', onWheel, { passive: true })
  scroller.addEventListener('touchstart', onTouchStart, { passive: true })
  scroller.addEventListener('pointerdown', onPointerDown, { passive: true })
  scroller.addEventListener('mousedown', onMouseDown, { passive: true })
  win.addEventListener('resize', onResize)

  return () => {
    scroller.removeEventListener('wheel', onWheel)
    scroller.removeEventListener('touchstart', onTouchStart)
    scroller.removeEventListener('pointerdown', onPointerDown)
    scroller.removeEventListener('mousedown', onMouseDown)
    win.removeEventListener('resize', onResize)
  }
}

/**
 * The plugin value owns the animator and the listeners, so both live and die
 * with the editor view.
 */
export class TypewriterAnimation implements PluginValue {
  private readonly centering: TypewriterCentering
  private readonly unwatch: () => void

  constructor(private readonly view: EditorView) {
    // A native smooth scroll on the scroller would smooth every frame below.
    view.scrollDOM.style.scrollBehavior = 'auto'

    const win = view.contentDOM.ownerDocument.defaultView ?? window
    this.centering = new TypewriterCentering({
      scroller: view.scrollDOM,
      scheduler: browserFrameScheduler(win),
      lineHeight: () => view.defaultLineHeight,
      measure: (head) => ({ paddingTop: view.documentPadding.top, block: view.lineBlockAt(head) })
    })
    this.unwatch = watchCancelSources({
      scroller: view.scrollDOM,
      win,
      cancel: (reason) => this.centering.cancel(reason)
    })
  }

  centerCaret(head: number): ScrollOutcome {
    return this.centering.center(head)
  }

  cancel(reason: string): void {
    this.centering.cancel(reason)
  }

  update(update: ViewUpdate): void {
    // Hidden in `preview` mode: the scroller has no height to animate in.
    if (update.geometryChanged && update.view.scrollDOM.clientHeight <= 0) this.cancel('hidden')
  }

  destroy(): void {
    this.cancel('destroy')
    this.unwatch()
    this.view.scrollDOM.style.scrollBehavior = ''
  }
}

export const typewriterAnimation = ViewPlugin.fromClass(TypewriterAnimation)

/**
 * Takes over the vertical centering. Any other target — PageUp/PageDown, a
 * snapshot, a future `y: "start"` — cancels the flight and keeps the native
 * scroll, so the editor never recenters behind the user's back.
 */
export function handleCenterScroll(
  view: EditorView,
  range: SelectionRange,
  options: ScrollHandlerOptions
): boolean {
  const animation = view.plugin(typewriterAnimation)

  if (options.y !== 'center' || options.x !== 'nearest') {
    animation?.cancel('native scroll')

    return false
  }

  // Without the plugin there is nothing to animate: let CodeMirror scroll.
  if (!animation) return false

  animation.centerCaret(range.head)

  return true
}

export const typewriterCenterScroll = EditorView.scrollHandler.of(handleCenterScroll)
