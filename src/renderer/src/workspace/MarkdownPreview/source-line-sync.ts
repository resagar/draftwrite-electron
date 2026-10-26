/**
 * Line-based scroll sync between the editor and the rendered preview.
 *
 * The preview renders a `<span data-source-line="N">` marker at the start of
 * every source line that carries text, and block anchors as a fallback. The
 * sync uses the editor's top visible line as the reference: inside that line
 * both panes move proportionally, so the motion is continuous, and at every
 * line boundary the preview lands exactly on the same source line.
 */
import type { EditorView } from '@codemirror/view'
import {
  SOURCE_END_LINE_ATTRIBUTE,
  SOURCE_LINE_ATTRIBUTE,
  SOURCE_START_LINE_ATTRIBUTE
} from './source-lines'

/** Top of a rendered line, in the preview's content coordinates. */
export type LineAnchor = { line: number; top: number }

/** A rendered block, with the marker lines it contains. */
export type PreviewBlock = {
  start: number
  end: number
  top: number
  markers: LineAnchor[]
}

/**
 * Everything the sync needs from the rendered preview. `ordered` is sorted by
 * `top`; `nextTopByLine` is the top of the following rendered line, which gives
 * the span to interpolate through.
 */
export type PreviewLineIndex = {
  byLine: ReadonlyMap<number, number>
  ordered: readonly LineAnchor[]
  blocks: readonly PreviewBlock[]
  nextTopByLine: ReadonlyMap<number, number>
}

/** A rendered line resolved from a source line: where it starts and ends. */
export type LineEntry = { line: number; top: number; nextTop: number }

export type Scrollable = {
  scrollTop: number
  readonly clientHeight: number
  readonly scrollHeight: number
}

export type ScrollSource = Scrollable &
  Pick<HTMLElement, 'addEventListener' | 'removeEventListener'>

/** How the sync maps a scroll position from one pane to the other. */
export type LineScrollMap = {
  toPreview: (editorScrollTop: number) => number | null
  toEditor: (previewScrollTop: number) => number | null
}

/** Tolerance for "this marker is at the viewport top". */
const TOP_EPSILON = 1

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))
const clamp = (value: number, max: number): number => Math.min(max, Math.max(0, value))

/** Top of `element` in the preview's content coordinates, independent of scroll. */
function contentTop(container: HTMLElement, element: HTMLElement): number {
  const containerRect = container.getBoundingClientRect()
  const rect = element.getBoundingClientRect()

  return rect.top - containerRect.top - container.clientTop + container.scrollTop
}

function markersIn(container: HTMLElement, root: HTMLElement): LineAnchor[] {
  const anchors: LineAnchor[] = []

  for (const marker of root.querySelectorAll<HTMLElement>(`[${SOURCE_LINE_ATTRIBUTE}]`)) {
    const line = Number(marker.getAttribute(SOURCE_LINE_ATTRIBUTE))

    if (Number.isFinite(line)) {
      anchors.push({ line, top: contentTop(container, marker) })
    }
  }

  return anchors
}

/** Reads the rendered preview once. Call it on content or geometry changes. */
export function buildPreviewLineIndex(
  container: HTMLElement,
  article: HTMLElement
): PreviewLineIndex {
  const ordered = markersIn(container, article).sort((a, b) => a.top - b.top)
  const byLine = new Map<number, number>()
  const nextTopByLine = new Map<number, number>()

  for (let index = 0; index < ordered.length; index += 1) {
    const anchor = ordered[index]

    if (!byLine.has(anchor.line)) {
      byLine.set(anchor.line, anchor.top)
      nextTopByLine.set(anchor.line, ordered[index + 1]?.top ?? anchor.top)
    }
  }

  const blocks: PreviewBlock[] = []

  for (const element of article.querySelectorAll<HTMLElement>(`[${SOURCE_START_LINE_ATTRIBUTE}]`)) {
    const start = Number(element.getAttribute(SOURCE_START_LINE_ATTRIBUTE))
    const end = Number(element.getAttribute(SOURCE_END_LINE_ATTRIBUTE))

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      continue
    }

    blocks.push({
      start,
      end,
      top: contentTop(container, element),
      markers: markersIn(container, element).sort((a, b) => a.top - b.top)
    })
  }

  return { byLine, ordered, blocks, nextTopByLine }
}

/** The entry of a marker, with the top of the line that follows it. */
function entryOf(index: PreviewLineIndex, anchor: LineAnchor): LineEntry {
  return {
    line: anchor.line,
    top: anchor.top,
    nextTop: index.nextTopByLine.get(anchor.line) ?? anchor.top
  }
}

/** Nearest anchor to `line`, or `null` when the index has none. */
function nearestAnchor(anchors: readonly LineAnchor[], line: number): LineAnchor | null {
  let nearest: LineAnchor | null = null

  for (const anchor of anchors) {
    if (nearest === null || Math.abs(anchor.line - line) < Math.abs(nearest.line - line)) {
      nearest = anchor
    }
  }

  return nearest
}

/**
 * Rendered line for a source line.
 *
 * The exact marker wins; a line without text (blank line, fence, delimiter)
 * falls back to the block that contains it and then to the nearest marker, so
 * it lands on real rendered text.
 */
export function anchorForLine(index: PreviewLineIndex, line: number): LineEntry | null {
  const exact = index.byLine.get(line)

  if (exact !== undefined) {
    return { line, top: exact, nextTop: index.nextTopByLine.get(line) ?? exact }
  }

  const block = index.blocks.find((candidate) => candidate.start <= line && line <= candidate.end)

  if (block !== undefined) {
    const anchor = nearestAnchor(block.markers, line)

    return anchor === null ? { line, top: block.top, nextTop: block.top } : entryOf(index, anchor)
  }

  const anchor = nearestAnchor(index.ordered, line)

  return anchor === null ? null : entryOf(index, anchor)
}

/**
 * Rendered line at the top of the preview viewport: the last marker whose top
 * is at or above the scroll position. A partially visible line still counts as
 * the top line, which is what keeps the motion continuous.
 */
export function entryAtTop(index: PreviewLineIndex, scrollTop: number): LineEntry | null {
  if (index.ordered.length === 0) {
    return null
  }

  let low = 0
  let high = index.ordered.length

  while (low < high) {
    const middle = (low + high) >> 1

    if (index.ordered[middle].top <= scrollTop + TOP_EPSILON) {
      low = middle + 1
    } else {
      high = middle
    }
  }

  return entryOf(index, index.ordered[Math.max(0, low - 1)])
}

/** Source line and block geometry at the top of the editor viewport. */
export function editorBlockAtTop(
  view: EditorView,
  scrollTop: number
): { line: number; top: number; height: number } {
  const block = view.lineBlockAtHeight(scrollTop)

  return {
    line: view.state.doc.lineAt(block.from).number,
    top: view.documentPadding.top + block.top,
    height: block.height
  }
}

/** Editor block top and height for a source line, in content coordinates. */
export function editorBlockForLine(
  view: EditorView,
  line: number
): { top: number; height: number } {
  const clamped = Math.min(Math.max(1, line), view.state.doc.lines)
  const block = view.lineBlockAt(view.state.doc.line(clamped).from)

  return { top: view.documentPadding.top + block.top, height: block.height }
}

/**
 * Preview `scrollTop` for an editor `scrollTop`.
 *
 * Above the first line it interpolates from the editor's top padding to the
 * first rendered line. Inside the reference line it interpolates from that
 * line's top to the next line's top, which is what makes the movement fluid.
 */
export function editorToPreview(
  view: EditorView,
  index: PreviewLineIndex,
  scrollTop: number,
  max: number
): number | null {
  const block = editorBlockAtTop(view, scrollTop)
  const entry = anchorForLine(index, block.line)

  if (entry === null) {
    return null
  }

  if (scrollTop < block.top) {
    const fraction = block.top <= 0 ? 1 : clamp01(scrollTop / block.top)

    return clamp(entry.top * fraction, max)
  }

  const span = block.height > 0 ? block.height : 1
  const fraction = clamp01((scrollTop - block.top) / span)

  return clamp(entry.top + fraction * (entry.nextTop - entry.top), max)
}

/**
 * Editor `scrollTop` for a preview `scrollTop`, the inverse of
 * `editorToPreview`: above the first rendered line it interpolates from zero to
 * the first line, and inside a line it interpolates across its editor block.
 */
export function previewToEditor(
  view: EditorView,
  index: PreviewLineIndex,
  scrollTop: number,
  max: number
): number | null {
  const entry = entryAtTop(index, scrollTop)

  if (entry === null) {
    return null
  }

  const block = editorBlockForLine(view, entry.line)

  if (scrollTop < entry.top) {
    const fraction = entry.top <= 0 ? 1 : clamp01(scrollTop / entry.top)

    return clamp(block.top * fraction, max)
  }

  const span = entry.nextTop - entry.top
  const fraction = span <= 0 ? 0 : clamp01((scrollTop - entry.top) / span)

  return clamp(block.top + fraction * block.height, max)
}

/** Time and frame source, injected so tests can drive the animation by hand. */
export type FrameScheduler = {
  now: () => number
  request: (callback: (time: number) => void) => number
  cancel: (handle: number) => void
  reducedMotion: () => boolean
}

export function browserFrameScheduler(win: Window): FrameScheduler {
  return {
    now: () => win.performance.now(),
    request: (callback) => win.requestAnimationFrame(callback),
    cancel: (handle) => win.cancelAnimationFrame(handle),
    reducedMotion: () =>
      typeof win.matchMedia === 'function' &&
      win.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
}

const DURATION = 150

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

/**
 * Moves a scroller toward a target with a short ease-out flight. A new target
 * retargets the running flight from the live position, so continuous scrolling
 * produces one continuous motion instead of a queue of jumps.
 */
class SmoothTarget {
  private target: number | null = null
  private frame: number | null = null
  private from = 0
  private start = 0
  private last: number | null = null

  constructor(
    private readonly scroller: ScrollSource,
    private readonly scheduler: FrameScheduler
  ) {}

  set(target: number): void {
    if (this.scheduler.reducedMotion() || Math.abs(target - this.scroller.scrollTop) <= 1) {
      this.stop()
      this.scroller.scrollTop = target
      this.last = target

      return
    }

    this.from = this.scroller.scrollTop
    this.start = this.scheduler.now()
    this.target = target

    if (this.frame === null) {
      this.frame = this.scheduler.request(this.step)
    }
  }

  stop(): void {
    if (this.frame !== null) {
      this.scheduler.cancel(this.frame)
      this.frame = null
    }

    this.target = null
  }

  isActive(): boolean {
    return this.frame !== null
  }

  clearLast(): void {
    this.last = null
  }

  /** True when `value` is the last write of this animator; clears it. */
  consumeEcho(value: number): boolean {
    const echo = this.last !== null && Math.abs(value - this.last) <= 1
    this.last = null

    return echo
  }

  private step = (time: number): void => {
    if (this.target === null) {
      this.frame = null

      return
    }

    const t = Math.min(1, Math.max(0, (time - this.start) / DURATION))
    const value = this.from + (this.target - this.from) * easeOutCubic(t)
    this.scroller.scrollTop = value
    this.last = value

    if (t < 1) {
      this.frame = this.scheduler.request(this.step)
    } else {
      this.scroller.scrollTop = this.target
      this.last = this.target
      this.target = null
      this.frame = null
    }
  }
}

const defaultScheduler = (): FrameScheduler =>
  browserFrameScheduler(typeof window === 'undefined' ? (globalThis as unknown as Window) : window)

/** What the binding exposes to its owner. */
export type LineScrollBinding = {
  stop: () => void
  /** Re-applies the editor→preview target, e.g. after the spacer changes. */
  realign: () => void
}

/**
 * Wires the two scrollers with the given mapping.
 *
 * The driven pane eases toward the target instead of jumping; its scroll events
 * are ignored while it is animating (and for the late echo of the final frame),
 * so the two directions never bounce each other.
 */
export function bindLineScrollSync(
  from: ScrollSource,
  to: ScrollSource,
  map: LineScrollMap,
  scheduler: FrameScheduler = defaultScheduler()
): LineScrollBinding {
  const toTarget = new SmoothTarget(to, scheduler)
  const fromTarget = new SmoothTarget(from, scheduler)

  const onFromScroll = (): void => {
    if (fromTarget.isActive() || fromTarget.consumeEcho(from.scrollTop)) {
      return
    }

    fromTarget.stop()
    const target = map.toPreview(from.scrollTop)

    if (target !== null) {
      toTarget.set(target)
    }
  }

  const onToScroll = (): void => {
    if (toTarget.isActive() || toTarget.consumeEcho(to.scrollTop)) {
      return
    }

    toTarget.stop()
    const target = map.toEditor(to.scrollTop)

    if (target !== null) {
      fromTarget.set(target)
    }
  }

  const cancelFrom = (): void => {
    fromTarget.stop()
    fromTarget.clearLast()
  }

  const cancelTo = (): void => {
    toTarget.stop()
    toTarget.clearLast()
  }

  const gestures = ['wheel', 'touchstart', 'pointerdown'] as const

  from.addEventListener('scroll', onFromScroll, { passive: true })
  to.addEventListener('scroll', onToScroll, { passive: true })
  for (const gesture of gestures) {
    from.addEventListener(gesture, cancelFrom, { passive: true })
    to.addEventListener(gesture, cancelTo, { passive: true })
  }

  const stop = (): void => {
    from.removeEventListener('scroll', onFromScroll)
    to.removeEventListener('scroll', onToScroll)
    for (const gesture of gestures) {
      from.removeEventListener(gesture, cancelFrom)
      to.removeEventListener(gesture, cancelTo)
    }
  }

  return {
    stop,
    realign: (): void => {
      // A hidden editor has no geometry to align against.
      if (from.clientHeight <= 0) {
        return
      }

      const target = map.toPreview(from.scrollTop)

      if (target !== null) {
        toTarget.set(target)
      }
    }
  }
}
