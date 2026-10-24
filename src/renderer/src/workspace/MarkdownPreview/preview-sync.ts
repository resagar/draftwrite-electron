/**
 * Geometry behind the preview's caret tracking.
 *
 * The preview is its own scroller: two measured spacers make the first block
 * centreable and give the last one finite room below, and the caret line is
 * centred by writing `scrollTop`. Everything here either reads the annotated
 * DOM or does arithmetic, so the math can be tested without layout.
 *
 * The annotations come from `source-lines.ts`: `[data-source-line="N"]` markers
 * for lines that render text, and `data-source-start-line` /
 * `data-source-end-line` anchors for blocks.
 */

import { caretAnchorOffset, centerOffset } from '../../scroll/smooth-scroll'
import {
  SOURCE_END_LINE_ATTRIBUTE,
  SOURCE_LINE_ATTRIBUTE,
  SOURCE_START_LINE_ATTRIBUTE,
  nearestMarkerLine
} from './source-lines'

/** Minimal rectangle. A `DOMRect` is structurally compatible with it. */
export type Rect = {
  top: number
  bottom: number
  left: number
  width: number
  height: number
}

/** A block anchor and the source lines it covers. */
export type SourceBlock = {
  element: HTMLElement
  startLine: number
  endLine: number
  /** Ancestor count up to the article: the innermost block wins. */
  depth: number
  /** Rendered at the foot of the document, so never a fallback. */
  isFootnote: boolean
}

/** Inline containers whose text can be measured as one source line. */
const INLINE_BLOCK = 'p, h1, h2, h3, h4, h5, h6, li, td, th, code'

/** Attribute of the footnotes section that `remark-gfm` appends. */
const FOOTNOTES_SELECTOR = '[data-footnotes]'

/**
 * Reads the block anchors of an article, in document order.
 *
 * Anchors live on headings, paragraphs, list items, quotes, `pre`, the table
 * wrapper, rows and `hr`. The footnote section itself carries no position, so
 * only its definitions show up here, flagged through `isFootnote`.
 */
export function readSourceBlocks(article: HTMLElement): SourceBlock[] {
  const blocks: SourceBlock[] = []

  for (const element of article.querySelectorAll<HTMLElement>(`[${SOURCE_START_LINE_ATTRIBUTE}]`)) {
    const start = element.getAttribute(SOURCE_START_LINE_ATTRIBUTE)
    const end = element.getAttribute(SOURCE_END_LINE_ATTRIBUTE)
    const startLine = Number(start)
    const endLine = Number(end)

    if (
      start === null ||
      end === null ||
      !Number.isFinite(startLine) ||
      !Number.isFinite(endLine)
    ) {
      continue
    }

    let depth = 0
    for (let parent = element.parentElement; parent !== null && parent !== article;) {
      depth += 1
      parent = parent.parentElement
    }

    blocks.push({
      element,
      startLine,
      endLine,
      depth,
      isFootnote: element.closest(FOOTNOTES_SELECTOR) !== null
    })
  }

  return blocks
}

/** Innermost block first, then the shortest source span. */
function isMoreSpecific(candidate: SourceBlock, current: SourceBlock): boolean {
  if (candidate.depth !== current.depth) {
    return candidate.depth > current.depth
  }

  return candidate.endLine - candidate.startLine < current.endLine - current.startLine
}

/**
 * Block that stands for `line`, with these rules in order:
 *
 * 1. A block that contains the line.
 * 2. A body block over a footnote block: a definition is rendered at the foot
 *    of the document, so it must never win a comparison against the body.
 * 3. The deepest block: the list item, not the list; the row, not the table.
 * 4. The shortest span, as a conservative tie-break.
 * 5. Otherwise, the body block that ends closest before the line: blank lines,
 *    fences and the end of the document belong to what was written just above.
 * 6. Otherwise, the first body block, which covers a line above the document.
 * 7. With no body block at all, `null`.
 */
export function findBlockForLine(blocks: readonly SourceBlock[], line: number): SourceBlock | null {
  let containing: SourceBlock | null = null
  let footnoteContaining: SourceBlock | null = null

  for (const candidate of blocks) {
    if (candidate.startLine > line || line > candidate.endLine) {
      continue
    }

    if (candidate.isFootnote) {
      if (footnoteContaining === null || isMoreSpecific(candidate, footnoteContaining)) {
        footnoteContaining = candidate
      }
    } else if (containing === null || isMoreSpecific(candidate, containing)) {
      containing = candidate
    }
  }

  if (containing !== null) {
    return containing
  }

  if (footnoteContaining !== null) {
    return footnoteContaining
  }

  let preceding: SourceBlock | null = null

  for (const candidate of blocks) {
    if (candidate.isFootnote || candidate.endLine >= line) {
      continue
    }

    if (
      preceding === null ||
      candidate.endLine > preceding.endLine ||
      (candidate.endLine === preceding.endLine && isMoreSpecific(candidate, preceding))
    ) {
      preceding = candidate
    }
  }

  if (preceding !== null) {
    return preceding
  }

  return blocks.find((candidate) => !candidate.isFootnote) ?? null
}

/** One source line: the marker the caret line starts at. */
export type LineTarget = { kind: 'line'; anchor: HTMLElement; line: number }

/** A block with no marked text of its own, centred as a whole. */
export type BlockTarget = { kind: 'block'; element: HTMLElement }

/** What the scroll should centre: one source line, or a whole block. */
export type PreviewTarget = LineTarget | BlockTarget

/** A source line as it renders: its rows joined, plus the height of the first. */
export type LineRect = Rect & { firstRowHeight: number }

/** A gap over this many row heights is a different block, not the next row. */
const ROW_GAP_TOLERANCE = 1.6

/**
 * Element to centre for `line`, in this order:
 *
 * 1. The marker of the line itself: the line renders text.
 * 2. The block that stands for the line (`findBlockForLine`), snapped to the
 *    nearest marker inside it, so a blank line, a fence, a setext underline or
 *    a table delimiter lands on real text.
 * 3. The block rect, for blocks that render no marked text: `hr`, an
 *    image-only paragraph.
 *
 * `null` means the document has nothing to follow.
 */
export function findTarget(
  article: HTMLElement,
  line: number,
  blocks: readonly SourceBlock[]
): PreviewTarget | null {
  const exact = article.querySelector<HTMLElement>(`[${SOURCE_LINE_ATTRIBUTE}="${line}"]`)

  if (exact !== null) {
    return { kind: 'line', anchor: exact, line }
  }

  const block = findBlockForLine(blocks, line)

  if (block === null) {
    return null
  }

  const markers: { line: number; element: HTMLElement }[] = []

  for (const marker of block.element.querySelectorAll<HTMLElement>(`[${SOURCE_LINE_ATTRIBUTE}]`)) {
    const markerLine = Number(marker.getAttribute(SOURCE_LINE_ATTRIBUTE))

    if (Number.isFinite(markerLine)) {
      markers.push({ line: markerLine, element: marker })
    }
  }

  const nearest = nearestMarkerLine(
    markers.map((marker) => marker.line),
    line
  )
  const snapped = markers.find((marker) => marker.line === nearest)

  if (snapped === undefined) {
    return { kind: 'block', element: block.element }
  }

  return { kind: 'line', anchor: snapped.element, line: snapped.line }
}

/** Same rect, with the row height the centre calculation needs. */
function asLineRect(rect: Rect): LineRect {
  return {
    top: rect.top,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    firstRowHeight: rect.height
  }
}

/**
 * Rect of one source line, built from the rows that render it: their union,
 * plus the height of the first one.
 *
 * Column-free on purpose: the store publishes the line, not the caret position
 * inside a reflowed line, so the whole span of the line is what gets centred.
 * `null` when no row survived the contiguity filter, so the caller can fall
 * back to the rect of the marker.
 */
export function computeLineRect(rows: Iterable<Rect>): LineRect | null {
  const kept = keepContiguousRows(rows)

  if (kept.length === 0) {
    return null
  }

  const top = Math.min(...kept.map((row) => row.top))
  const bottom = Math.max(...kept.map((row) => row.bottom))

  return {
    top,
    bottom,
    left: kept[0].left,
    width: kept[0].width,
    height: bottom - top,
    firstRowHeight: kept[0].height
  }
}

/**
 * Rows the browser lays out for the text of one source line, from its marker up
 * to the next marker of the same block (or the end of the block).
 *
 * Reads layout, so it is the thin adapter of `computeLineRect`: Jest has no
 * layout to read and tests the arithmetic instead.
 */
function measureLineRows(anchor: HTMLElement, next: HTMLElement | null): DOMRect[] {
  const block = anchor.closest<HTMLElement>(INLINE_BLOCK)

  if (block === null) {
    return []
  }

  const range = document.createRange()
  range.setStartAfter(anchor)

  if (next !== null && block.contains(next)) {
    range.setEndBefore(next)
  } else {
    range.setEnd(block, block.childNodes.length)
  }

  return Array.from(range.getClientRects())
}

/**
 * Rows that can belong to the same line: wrapped rows sit right below each
 * other, while a nested block or a stray `sup` starts a group of its own.
 * Groups after the first real gap are dropped.
 */
export function keepContiguousRows(rects: Iterable<Rect>): Rect[] {
  const rows = Array.from(rects)
    .filter((rect) => rect.height > 0)
    .sort((a, b) => a.top - b.top)
  const kept: Rect[] = []
  let bottom = Number.NEGATIVE_INFINITY

  for (const row of rows) {
    if (kept.length > 0 && row.top - bottom > ROW_GAP_TOLERANCE * row.height) {
      break
    }

    kept.push(row)
    bottom = Math.max(bottom, row.bottom)
  }

  return kept
}

/**
 * Top spacer: how much blank space the first block needs above it to sit in the
 * middle of the viewport at `scrollTop = 0`.
 *
 * `T = max(0, H/2 - F - h/2)`. A first block taller than the top half clamps to
 * zero: there is no negative space to give it.
 */
export function topSpacerHeight(
  viewportHeight: number,
  firstTop: number,
  firstHeight: number,
  lineUnit = 0
): number {
  return Math.max(
    0,
    viewportHeight / 2 - caretAnchorOffset(lineUnit, viewportHeight) - firstTop - firstHeight / 2
  )
}

/**
 * Bottom spacer: how much blank space the last block needs below it to reach the
 * top edge of the viewport at the maximum scroll, and not one pixel more.
 *
 * `B = max(0, H - (A - L))`. It does not depend on the top spacer or on the
 * height of the last block; the leftover blank space at the maximum scroll is
 * `H - hLast`, so the free scroll stays finite.
 */
export function bottomSpacerHeight(
  viewportHeight: number,
  articleHeight: number,
  lastTop: number
): number {
  return Math.max(0, viewportHeight - (articleHeight - lastTop))
}

/**
 * Top spacer that centres the first SOURCE LINE, not the whole first block.
 *
 * `T = max(0, H/2 - lineTop - lineHeight/2)`. The block formula would centre a
 * tall first paragraph instead of the line the writer is on; with the marker
 * rect this is the line that lands at `H/2` when `scrollTop = 0`.
 */
export function topSpacerForLine(
  viewportHeight: number,
  lineCenter: number,
  lineUnit: number
): number {
  return Math.max(0, viewportHeight / 2 - caretAnchorOffset(lineUnit, viewportHeight) - lineCenter)
}

/**
 * Bottom spacer that lets the last SOURCE LINE reach the centre, not just the
 * top of its block.
 *
 * `B = max(0, H/2 + lineTop + lineHeight/2 - articleHeight)`. The last block can
 * be taller than the viewport, and the line inside it may sit far below the
 * block top: the block formula gives no room there, while this one keeps the
 * caret line centreable. The caller takes the maximum with the block formula so
 * the last block can still reach the top edge.
 */
export function bottomSpacerForLine(
  viewportHeight: number,
  articleHeight: number,
  lineCenter: number,
  lineUnit: number
): number {
  return Math.max(
    0,
    viewportHeight / 2 + caretAnchorOffset(lineUnit, viewportHeight) + lineCenter - articleHeight
  )
}

/** Arguments of `centerScrollTop`, all in CSS pixels. */
export type CenterArgs = {
  /** Top of the target in the scroller's content coordinates. */
  top: number
  /** Height of the whole target span. */
  height: number
  /** Height of the first visual row; defaults to the whole span. */
  firstRowHeight?: number
  viewportHeight: number
  /** Live `scrollHeight` of the scroller. */
  scrollHeight: number
  /** One visual row of the target: the caret anchor is nine of these. */
  lineUnit?: number
}

/**
 * `scrollTop` that puts the middle of the target in the middle of the viewport.
 *
 * A span taller than the viewport cannot be centred with its caret visible, so
 * its first row is centred instead: deterministic, and free of column math. The
 * arithmetic itself is the shared `centerOffset`, also used by the editor.
 */
export function centerScrollTop({
  top,
  height,
  firstRowHeight = height,
  viewportHeight,
  scrollHeight,
  lineUnit = 0
}: CenterArgs): number {
  const span = height > viewportHeight ? firstRowHeight : height

  return centerOffset(
    top,
    span,
    viewportHeight,
    scrollHeight,
    caretAnchorOffset(lineUnit, viewportHeight)
  )
}

/** Fallback row height when nothing around the target can tell one (22 px). */
const DEFAULT_LINE_UNIT = 22

/** Where the target sits, in the scroller's content coordinates. */
export type TargetMeasurement = {
  top: number
  height: number
  /** Span to centre when the target is taller than the viewport. */
  firstRowHeight: number
  /** One measured visual row, or 0 when the target has no rows of its own. */
  rowHeight: number
}

/** A target as it can be measured, without touching the DOM. */
export type TargetGeometry = {
  /** Rect of the whole target, in viewport coordinates. */
  rect: Rect
  /** Visual rows of a line target; empty for a block, which has none. */
  rows: readonly Rect[]
  /** Top of the scroller's content box, in viewport coordinates. */
  containerTop: number
  /** Live `scrollTop` of the scroller. */
  scrollTop: number
}

/**
 * Where the target sits inside the scroller, in content coordinates: the
 * coordinates that do not move while the user scrolls.
 *
 * The content top is recovered from the viewport distance, the container's top
 * border and the live scroll, so the result stays valid for a scroll that
 * happens before the write. The rows of a line win over its marker rect; a
 * block has no rows, so its own rect stands for the span and `rowHeight` stays
 * 0: the height of a block is never a row height.
 */
export function computeTarget({
  rect,
  rows,
  containerTop,
  scrollTop
}: TargetGeometry): TargetMeasurement {
  const line = computeLineRect(rows)
  const span = line ?? asLineRect(rect)

  return {
    top: span.top - containerTop + scrollTop,
    height: span.height,
    firstRowHeight: span.firstRowHeight,
    rowHeight: line?.firstRowHeight ?? 0
  }
}

/** Marker right after `anchor` inside its inline block, if any. */
function nextMarker(anchor: HTMLElement): HTMLElement | null {
  const block = anchor.closest<HTMLElement>(INLINE_BLOCK)

  if (block === null) {
    return null
  }

  const markers = block.querySelectorAll<HTMLElement>(`[${SOURCE_LINE_ATTRIBUTE}]`)
  const index = Array.prototype.indexOf.call(markers, anchor)

  return index >= 0 && index + 1 < markers.length ? markers[index + 1] : null
}

/**
 * Element whose resolved `line-height` stands for one row of the target: the
 * block itself, or the inline block the line renders in.
 */
function lineHeightSource(target: PreviewTarget): HTMLElement {
  if (target.kind === 'block') {
    return target.element
  }

  return (
    target.anchor.closest<HTMLElement>(INLINE_BLOCK) ?? target.anchor.parentElement ?? target.anchor
  )
}

/**
 * Resolves a computed `line-height` to pixels.
 *
 * `normal` (the initial value) depends on the font metrics the browser used, so
 * it cannot be resolved here and returns `null`; a unitless value is a factor of
 * the font size; a `px` value is already the answer. Any other unit is left
 * unresolved on purpose: the caller keeps walking the fallback chain.
 */
export function parseLineHeight(value: string, fontSize: number): number | null {
  const text = value.trim()

  if (text === '' || text === 'normal') {
    return null
  }

  if (text.endsWith('px')) {
    const pixels = Number.parseFloat(text)

    return Number.isFinite(pixels) && pixels > 0 ? pixels : null
  }

  const factor = Number(text)

  if (!Number.isFinite(factor) || factor <= 0 || !Number.isFinite(fontSize) || fontSize <= 0) {
    return null
  }

  return factor * fontSize
}

/** What surrounds the target to tell the height of one of its rows. */
export type LineUnitArgs = {
  /** Height of a measured row, or 0 when the target has no rows (a block). */
  rowHeight: number
  /** Resolved `line-height` of the target block, when it could be read. */
  blockLineHeight?: number | null
  /** Resolved `line-height` of the article, when it could be read. */
  articleLineHeight?: number | null
}

/**
 * Height of one visual row of the target: the floor of the motion threshold.
 *
 * A measured row wins. A target without rows — a block anchor such as `hr` or an
 * image-only paragraph — falls back to the resolved `line-height` of its block,
 * then to the article's, and only then to 22 px. Never to the height of the
 * block: an image taller than the viewport would raise the threshold to its own
 * height and turn every caret move into an instant jump.
 */
export function resolveLineUnit({
  rowHeight,
  blockLineHeight = null,
  articleLineHeight = null
}: LineUnitArgs): number {
  // The resolved CSS line-height is the typographic line; the measured row is
  // the glyph box, which is shorter (16 px vs 21.125 px in the preview), so it
  // is only a fallback. Using the glyph box would shorten the caret offset.
  if (blockLineHeight !== null && blockLineHeight > 0) {
    return blockLineHeight
  }

  if (articleLineHeight !== null && articleLineHeight > 0) {
    return articleLineHeight
  }

  if (rowHeight > 0) {
    return rowHeight
  }

  return DEFAULT_LINE_UNIT
}

/** Resolved `line-height` of an element, or `null` when it cannot be resolved. */
function readLineHeight(element: HTMLElement): number | null {
  const win = element.ownerDocument.defaultView

  if (win === null) {
    return null
  }

  const style = win.getComputedStyle(element)

  return parseLineHeight(style.lineHeight, Number.parseFloat(style.fontSize))
}

/** Typographic line of a marker: its inline block, the article, then 22 px. */
function markerLineUnit(marker: HTMLElement, article: HTMLElement): number {
  const source = marker.closest<HTMLElement>(INLINE_BLOCK) ?? marker.parentElement ?? marker

  return readLineHeight(source) ?? readLineHeight(article) ?? DEFAULT_LINE_UNIT
}

/**
 * Reads the DOM for one target. Thin on purpose: every number it produces comes
 * out of `computeTarget`, which Jest exercises with plain rects.
 */
function measureTarget(container: HTMLElement, target: PreviewTarget): TargetMeasurement {
  const containerRect = container.getBoundingClientRect()
  const rows =
    target.kind === 'line' ? measureLineRows(target.anchor, nextMarker(target.anchor)) : []
  const rect = (target.kind === 'line' ? target.anchor : target.element).getBoundingClientRect()

  return computeTarget({
    rect,
    rows,
    containerTop: containerRect.top + container.clientTop,
    scrollTop: container.scrollTop
  })
}

/** Arguments of `measurePreviewSync`. All elements belong to the preview. */
export type MeasurePreviewArgs = {
  container: HTMLElement
  article: HTMLElement
  topSpacer: HTMLElement
  bottomSpacer: HTMLElement
  /** Cursor line, or `null` when there is no caret to follow yet. */
  line: number | null
}

/**
 * What a sync has to do: the spacer heights it wrote (already applied) and where
 * the target should end up. The caller owns the single `scrollTop` write.
 */
export type PreviewMeasurement = {
  /** Height written to the top spacer; the caller keeps it to compensate. */
  topSpacer: number
  /** Centre destination in content coordinates, or `null` without a target. */
  target: number | null
  /**
   * One visual row of the target, for the motion threshold: a measured row, the
   * resolved `line-height`, or 22 px — never the height of a whole block.
   */
  lineUnit: number
}

/**
 * Writes the spacers and measures the destination.
 *
 * `null` means there is nothing to measure: jsdom, or the preview mounted in a
 * hidden pane (`clientHeight === 0`).
 */
export function measurePreviewSync({
  container,
  article,
  topSpacer,
  bottomSpacer,
  line
}: MeasurePreviewArgs): PreviewMeasurement | null {
  const viewportHeight = container.clientHeight

  if (viewportHeight <= 0) {
    return null
  }

  const blocks = readSourceBlocks(article)

  if (blocks.length === 0) {
    topSpacer.style.height = '0px'
    bottomSpacer.style.height = '0px'

    return { topSpacer: 0, target: null, lineUnit: DEFAULT_LINE_UNIT }
  }

  const articleRect = article.getBoundingClientRect()
  const firstRect = blocks[0].element.getBoundingClientRect()
  const lastRect = blocks[blocks.length - 1].element.getBoundingClientRect()

  // The caret follows a source line, so the spacers are anchored to the first
  // and last rendered line markers. The block rects stay as the fallback for
  // anchors that render no marked text (an image-only paragraph, an `hr`).
  const markers = article.querySelectorAll<HTMLElement>(`[${SOURCE_LINE_ATTRIBUTE}]`)
  const firstMarker = markers[0] ?? null
  const lastMarker = markers[markers.length - 1] ?? null
  const firstMarkerRect = firstMarker?.getBoundingClientRect() ?? null
  const lastMarkerRect = lastMarker?.getBoundingClientRect() ?? null
  const firstLineCenter = firstMarkerRect
    ? firstMarkerRect.top - articleRect.top + firstMarkerRect.height / 2
    : 0
  const lastLineCenter = lastMarkerRect
    ? lastMarkerRect.top - articleRect.top + lastMarkerRect.height / 2
    : 0
  const firstLineUnit = firstMarker ? markerLineUnit(firstMarker, article) : DEFAULT_LINE_UNIT
  const lastLineUnit = lastMarker ? markerLineUnit(lastMarker, article) : DEFAULT_LINE_UNIT

  const topHeight =
    firstMarkerRect === null
      ? topSpacerHeight(
          viewportHeight,
          firstRect.top - articleRect.top,
          firstRect.height,
          DEFAULT_LINE_UNIT
        )
      : topSpacerForLine(viewportHeight, firstLineCenter, firstLineUnit)

  // Both conditions must hold: the last block can reach the top edge, and the
  // last line can still be centred when its block is taller than the viewport.
  const bottomHeight = Math.max(
    bottomSpacerHeight(viewportHeight, articleRect.height, lastRect.top - articleRect.top),
    lastMarkerRect === null
      ? 0
      : bottomSpacerForLine(viewportHeight, articleRect.height, lastLineCenter, lastLineUnit)
  )

  topSpacer.style.height = `${topHeight}px`
  bottomSpacer.style.height = `${bottomHeight}px`

  const target = line === null ? null : findTarget(article, line, blocks)

  if (target === null) {
    return { topSpacer: topHeight, target: null, lineUnit: DEFAULT_LINE_UNIT }
  }

  const measured = measureTarget(container, target)
  const lineUnit = resolveLineUnit({
    rowHeight: measured.rowHeight,
    blockLineHeight: readLineHeight(lineHeightSource(target)),
    articleLineHeight: readLineHeight(article)
  })
  const destination = centerScrollTop({
    top: measured.top,
    height: measured.height,
    firstRowHeight: measured.firstRowHeight,
    viewportHeight,
    scrollHeight: container.scrollHeight,
    lineUnit
  })

  return {
    topSpacer: topHeight,
    target: destination,
    lineUnit
  }
}
