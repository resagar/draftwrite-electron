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

  // The editor is at its last line, so it is also at its maximum scroll. The
  // preview must go to its own maximum: the last SOURCE line may wrap into
  // several visual rows, and the reader wants the last row at the top, not the
  // first row of the line.
  if (block.line === view.state.doc.lines) {
    return max
  }

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

/** What the binding exposes to its owner. */
export type LineScrollBinding = {
  stop: () => void
  /** Re-applies the editor→preview target, e.g. after the spacer changes. */
  realign: () => void
}

/** Tolerance for recognizing the scroll event of a programmatic write. */
const ECHO_EPSILON = 1

/**
 * Wires the two scrollers with the given mapping.
 *
 * The target is written synchronously in the same scroll event, so both panes
 * move together with no animation delay. The only adjustment is the mapping
 * itself: inside the reference line the preview advances at the ratio of its
 * rendered line span, and it lands exactly on the same line at every boundary.
 *
 * A programmatic write is remembered so the `scroll` event it causes does not
 * drive the other pane back.
 */
export function bindLineScrollSync(
  from: ScrollSource,
  to: ScrollSource,
  map: LineScrollMap
): LineScrollBinding {
  let lastFrom: number | null = null
  let lastTo: number | null = null

  const consumeEcho = (value: number, last: number | null): boolean => {
    return last !== null && Math.abs(value - last) <= ECHO_EPSILON
  }

  const onFromScroll = (): void => {
    if (consumeEcho(from.scrollTop, lastFrom)) {
      lastFrom = null

      return
    }

    lastFrom = null
    const target = map.toPreview(from.scrollTop)

    if (target === null) {
      return
    }

    lastTo = target
    to.scrollTop = target
  }

  const onToScroll = (): void => {
    if (consumeEcho(to.scrollTop, lastTo)) {
      lastTo = null

      return
    }

    lastTo = null
    const target = map.toEditor(to.scrollTop)

    if (target === null) {
      return
    }

    lastFrom = target
    from.scrollTop = target
  }

  from.addEventListener('scroll', onFromScroll, { passive: true })
  to.addEventListener('scroll', onToScroll, { passive: true })

  return {
    stop: (): void => {
      from.removeEventListener('scroll', onFromScroll)
      to.removeEventListener('scroll', onToScroll)
    },
    realign: (): void => {
      // A hidden editor has no geometry to align against.
      if (from.clientHeight <= 0) {
        return
      }

      const target = map.toPreview(from.scrollTop)

      if (target !== null) {
        lastTo = target
        to.scrollTop = target
      }
    }
  }
}
