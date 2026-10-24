import { describe, expect, it } from '@jest/globals'
import {
  bottomSpacerForLine,
  bottomSpacerHeight,
  centerScrollTop,
  computeLineRect,
  computeTarget,
  findBlockForLine,
  findTarget,
  keepContiguousRows,
  parseLineHeight,
  readSourceBlocks,
  resolveLineUnit,
  topSpacerForLine,
  topSpacerHeight,
  type Rect,
  type SourceBlock
} from './preview-sync'

/**
 * Pure arithmetic and plain DOM queries only: this suite passes rects and
 * numbers around instead of faking layout. jsdom lays nothing out, so anything
 * that reads a rect, a `clientHeight` or a `scrollTop` is verified with the
 * headless harness or in the app, not here.
 */

const element = (): HTMLElement => document.createElement('div')

const block = (startLine: number, endLine: number, depth = 0, isFootnote = false): SourceBlock => ({
  element: element(),
  startLine,
  endLine,
  depth,
  isFootnote
})

const lines = (result: SourceBlock | null): [number, number] | null =>
  result === null ? null : [result.startLine, result.endLine]

const row = (top: number, height = 16, left = 0, width = 200): Rect => ({
  top,
  bottom: top + height,
  left,
  width,
  height
})

describe('readSourceBlocks', () => {
  it('reads the anchors in document order and measures their depth', () => {
    document.body.innerHTML = `
      <article>
        <p data-source-start-line="1" data-source-end-line="2"></p>
        <ul data-source-start-line="4" data-source-end-line="6">
          <li data-source-start-line="4" data-source-end-line="4"></li>
        </ul>
      </article>
    `

    const article = document.querySelector('article') as HTMLElement
    const blocks = readSourceBlocks(article)

    expect(blocks.map((entry) => [entry.startLine, entry.endLine, entry.depth])).toEqual([
      [1, 2, 0],
      [4, 6, 0],
      [4, 4, 1]
    ])
    expect(blocks.map((entry) => entry.isFootnote)).toEqual([false, false, false])
    expect(blocks[1].element.tagName).toBe('UL')
  })

  it('ignores anchors without a numeric range', () => {
    document.body.innerHTML = `
      <article>
        <p data-source-start-line="1" data-source-end-line="1"></p>
        <p data-source-start-line="nope" data-source-end-line="2"></p>
        <p data-source-start-line="3"></p>
      </article>
    `

    const article = document.querySelector('article') as HTMLElement

    expect(readSourceBlocks(article).map((entry) => entry.startLine)).toEqual([1])
  })

  it('flags the blocks rendered inside the footnote section', () => {
    document.body.innerHTML = `
      <article>
        <p data-source-start-line="1" data-source-end-line="1"></p>
        <section data-footnotes="true" class="footnotes">
          <ol><li data-source-start-line="3" data-source-end-line="3"></li></ol>
        </section>
      </article>
    `

    const article = document.querySelector('article') as HTMLElement

    expect(readSourceBlocks(article).map((entry) => entry.isFootnote)).toEqual([false, true])
  })

  it('returns nothing for an article with no anchors', () => {
    document.body.innerHTML = '<article><p>plain</p></article>'

    const article = document.querySelector('article') as HTMLElement

    expect(readSourceBlocks(article)).toEqual([])
  })
})

describe('findBlockForLine', () => {
  it('prefers the innermost block: a list item over its list', () => {
    // Line 8 sits in both the list (6-8) and the second item (7-8).
    const blocks = [block(6, 8, 0), block(7, 8, 1)]

    expect(lines(findBlockForLine(blocks, 8))).toEqual([7, 8])
  })

  it('prefers the innermost block: a paragraph over its blockquote', () => {
    const blocks = [block(10, 10, 0), block(10, 10, 1)]

    expect(findBlockForLine(blocks, 10)).toBe(blocks[1])
  })

  it('prefers the innermost block: a row over its table', () => {
    const blocks = [block(16, 18, 0), block(16, 16, 1), block(18, 18, 1)]

    expect(findBlockForLine(blocks, 16)).toBe(blocks[1])
  })

  it('keeps the table for a line only the table covers, like its delimiter', () => {
    const blocks = [block(16, 18, 0), block(16, 16, 1), block(18, 18, 1)]

    expect(findBlockForLine(blocks, 17)).toBe(blocks[0])
  })

  it('breaks a depth tie with the shortest span', () => {
    const blocks = [block(4, 12, 1), block(10, 11, 1)]

    expect(findBlockForLine(blocks, 10)).toBe(blocks[1])
  })

  it('allows an exact match inside a footnote definition', () => {
    const blocks = [block(1, 1, 0), block(26, 26, 2, true)]

    expect(findBlockForLine(blocks, 26)).toBe(blocks[1])
  })

  it('never falls back to a footnote block', () => {
    // Line 27 is past both blocks; the footnote definition (26) is rendered at
    // the end of the document, so following it would jump to the foot.
    const blocks = [block(24, 24, 0), block(26, 26, 2, true)]

    expect(findBlockForLine(blocks, 27)).toBe(blocks[0])
  })

  it('falls back to the closest block that ends before the line', () => {
    const blocks = [block(1, 2, 0), block(10, 12, 0), block(20, 21, 0)]

    // A blank line between the paragraphs: the writer just wrote the previous one.
    expect(findBlockForLine(blocks, 15)).toBe(blocks[1])
  })

  it('falls back to the first body block for a line before the first block', () => {
    const blocks = [block(3, 4, 0), block(7, 7, 0)]

    expect(findBlockForLine(blocks, 1)).toBe(blocks[0])
  })

  it('returns null when there is no block to follow', () => {
    expect(findBlockForLine([], 1)).toBeNull()
    expect(findBlockForLine([block(5, 5, 0, true)], 1)).toBeNull()
  })
})

const ARTICLE_HTML = `
  <article>
    <p data-source-start-line="1" data-source-end-line="3"><span data-source-line="1"></span>a<br><span data-source-line="2"></span>b<br><span data-source-line="3"></span>c</p>
    <hr data-source-start-line="5" data-source-end-line="5">
  </article>
`

const renderArticle = (): HTMLElement => {
  document.body.innerHTML = ARTICLE_HTML

  return document.querySelector('article') as HTMLElement
}

describe('findTarget', () => {
  it('uses the marker of the line when the line renders text', () => {
    const article = renderArticle()
    const target = findTarget(article, 2, readSourceBlocks(article))

    expect(target?.kind).toBe('line')
    expect(target).toMatchObject({ kind: 'line', line: 2 })
    expect(target?.kind === 'line' ? target.anchor.getAttribute('data-source-line') : null).toBe(
      '2'
    )
  })

  it('snaps to the nearest marker of the containing block', () => {
    // Line 4 is blank: only the paragraph (1-3) stands for it.
    const article = renderArticle()
    const target = findTarget(article, 4, readSourceBlocks(article))

    expect(target).toMatchObject({ kind: 'line', line: 3 })
  })

  it('snaps to the previous marker when the block brackets the line', () => {
    // Line 2 of a block marked on 1 and 3: the tie goes to the previous line.
    const article = renderArticle()
    article.querySelector('[data-source-line="2"]')?.remove()
    const target = findTarget(article, 2, readSourceBlocks(article))

    expect(target).toMatchObject({ kind: 'line', line: 1 })
  })

  it('falls back to the block rect when the block has no markers', () => {
    const article = renderArticle()
    const target = findTarget(article, 5, readSourceBlocks(article))

    expect(target?.kind).toBe('block')
    expect(target?.kind === 'block' ? target.element.tagName : null).toBe('HR')
  })

  it('returns null when the document has neither markers nor blocks', () => {
    document.body.innerHTML = '<article><p>plain</p></article>'
    const article = document.querySelector('article') as HTMLElement

    expect(findTarget(article, 1, readSourceBlocks(article))).toBeNull()
  })
})

describe('keepContiguousRows', () => {
  it('keeps the wrapped rows of one source line', () => {
    const rows = [row(100), row(122.8), row(145.6)]

    expect(keepContiguousRows(rows)).toEqual(rows)
  })

  it('keeps rows that share a top, like two inline runs of the same row', () => {
    const rows = [row(100, 16, 0, 80), row(100, 16, 80, 120)]

    expect(keepContiguousRows(rows)).toHaveLength(2)
  })

  it('drops a group separated by a gap, like a nested block below the line', () => {
    const rows = [row(100), row(122.8), row(300), row(322.8)]

    expect(keepContiguousRows(rows)).toEqual([row(100), row(122.8)])
  })

  it('ignores rows with no height', () => {
    expect(keepContiguousRows([row(100, 0), row(100), row(122.8)])).toEqual([row(100), row(122.8)])
  })

  it('returns nothing for no rows', () => {
    expect(keepContiguousRows([])).toEqual([])
  })
})

describe('computeLineRect', () => {
  it('unions the visual rows of the line and keeps the height of its first row', () => {
    expect(computeLineRect([row(100), row(124)])).toEqual({
      top: 100,
      bottom: 140,
      left: 0,
      width: 200,
      height: 40,
      firstRowHeight: 16
    })
  })

  it('takes the left and the width of the first row', () => {
    expect(computeLineRect([row(100, 16, 40, 120), row(124, 16, 0, 200)])).toMatchObject({
      left: 40,
      width: 120
    })
  })

  it('drops the rows of another block before taking the union', () => {
    const line = computeLineRect([row(100), row(122.8), row(300)])

    expect(line?.top).toBe(100)
    expect(line?.firstRowHeight).toBe(16)
    // 122.8 + 16 - 100: the group at 300 is not part of this line.
    expect(line?.height).toBeCloseTo(38.8, 10)
  })

  it('returns null when no row survived, so the caller uses the marker rect', () => {
    expect(computeLineRect([])).toBeNull()
    expect(computeLineRect([row(100, 0)])).toBeNull()
  })
})

describe('computeTarget', () => {
  it('moves the union of the rows into the scroller content coordinates', () => {
    expect(
      computeTarget({
        rect: row(700),
        rows: [row(700), row(724)],
        containerTop: 100,
        scrollTop: 500
      })
    ).toEqual({
      top: 1100,
      height: 40,
      firstRowHeight: 16,
      // One measured row: the floor of the motion threshold.
      rowHeight: 16
    })
  })

  it('keeps the text of a scrolled scroller in the same content coordinates', () => {
    // The same line: 100 px lower in the viewport once the scroller moved 100
    // more. Content coordinates do not depend on the scroll.
    expect(
      computeTarget({ rect: row(700), rows: [row(700)], containerTop: 100, scrollTop: 500 }).top
    ).toBe(1100)
    expect(
      computeTarget({ rect: row(600), rows: [row(600)], containerTop: 100, scrollTop: 600 }).top
    ).toBe(1100)
  })

  it('falls back to the rect of the target when no row could be read', () => {
    expect(
      computeTarget({ rect: row(700, 20), rows: [], containerTop: 100, scrollTop: 500 })
    ).toEqual({ top: 1100, height: 20, firstRowHeight: 20, rowHeight: 0 })
  })

  it('reports no row for a block, whose rect is not one row', () => {
    // An image-only paragraph 400 px tall.
    const measured = computeTarget({ rect: row(300, 400), rows: [], containerTop: 0, scrollTop: 0 })

    expect(measured).toMatchObject({ height: 400, rowHeight: 0 })
  })
})

describe('parseLineHeight', () => {
  it('reads a px value as it is', () => {
    expect(parseLineHeight('24px', 16)).toBe(24)
    expect(parseLineHeight('21.6px', 16)).toBe(21.6)
  })

  it('multiplies a unitless factor by the computed font size', () => {
    expect(parseLineHeight('1.5', 16)).toBe(24)
    expect(parseLineHeight('2', 14)).toBe(28)
  })

  it('cannot resolve normal: it depends on the font metrics', () => {
    expect(parseLineHeight('normal', 16)).toBeNull()
  })

  it('cannot resolve an empty value or a unit it does not know', () => {
    expect(parseLineHeight('', 16)).toBeNull()
    expect(parseLineHeight('150%', 16)).toBeNull()
    expect(parseLineHeight('2em', 16)).toBeNull()
  })

  it('rejects a value that is not a positive number', () => {
    expect(parseLineHeight('0', 16)).toBeNull()
    expect(parseLineHeight('-1.5', 16)).toBeNull()
    expect(parseLineHeight('0px', 16)).toBeNull()
    // A unitless factor needs a font size to multiply.
    expect(parseLineHeight('1.5', 0)).toBeNull()
  })
})

describe('resolveLineUnit', () => {
  it('uses the measured row of a line target', () => {
    expect(resolveLineUnit({ rowHeight: 16, blockLineHeight: 24, articleLineHeight: 22 })).toBe(16)
  })

  it('falls back to the line-height of the block for a target without rows', () => {
    expect(resolveLineUnit({ rowHeight: 0, blockLineHeight: 24, articleLineHeight: 22 })).toBe(24)
  })

  it('falls back to the line-height of the article', () => {
    expect(resolveLineUnit({ rowHeight: 0, blockLineHeight: null, articleLineHeight: 24 })).toBe(24)
    expect(resolveLineUnit({ rowHeight: 0, articleLineHeight: 24 })).toBe(24)
  })

  it('falls back to 22 px when nothing resolves', () => {
    expect(resolveLineUnit({ rowHeight: 0 })).toBe(22)
    expect(resolveLineUnit({ rowHeight: 0, blockLineHeight: null, articleLineHeight: null })).toBe(
      22
    )
  })

  it('never turns a block taller than one row into the threshold', () => {
    const measured = computeTarget({ rect: row(300, 400), rows: [], containerTop: 0, scrollTop: 0 })

    // The block is 400 px tall; one row of it is still its line-height.
    expect(resolveLineUnit({ rowHeight: measured.rowHeight, blockLineHeight: 24 })).toBe(24)
    expect(resolveLineUnit({ rowHeight: measured.rowHeight })).toBe(22)
  })
})

describe('topSpacerHeight', () => {
  it('centres the first block when there is room above it', () => {
    // H = 500, F = 32, h = 40: 250 - 32 - 20.
    expect(topSpacerHeight(500, 32, 40)).toBe(198)
  })

  it('clamps to zero when the first block is already at or past the centre', () => {
    expect(topSpacerHeight(500, 400, 300)).toBe(0)
  })

  it('is zero with no viewport to fill', () => {
    expect(topSpacerHeight(0, 32, 40)).toBe(0)
  })
})

describe('bottomSpacerHeight', () => {
  it('gives the last block enough room to reach the top of the viewport', () => {
    // H = 500, A = 1000, L = 950: 500 - (1000 - 950).
    expect(bottomSpacerHeight(500, 1000, 950)).toBe(450)
  })

  it('clamps to zero when the last block is taller than the viewport', () => {
    expect(bottomSpacerHeight(500, 1000, 400)).toBe(0)
  })
})

describe('topSpacerForLine', () => {
  it('centres the first source line, not the whole first block', () => {
    // H = 500, lineTop = 0, lineHeight = 20: 250 - 0 - 10.
    expect(topSpacerForLine(500, 0, 20)).toBe(240)
  })

  it('clamps to zero when the line is already at or below the centre', () => {
    expect(topSpacerForLine(500, 400, 20)).toBe(0)
  })
})

describe('bottomSpacerForLine', () => {
  it('lets the last line centre inside a block taller than the viewport', () => {
    // H = 362, A = 1601.625, lineTop = 1533.5, lineHeight = 22:
    // 181 + 1533.5 + 11 - 1601.625.
    expect(bottomSpacerForLine(362, 1601.625, 1533.5, 22)).toBeCloseTo(123.875, 3)
  })

  it('clamps to zero when the last line already has room', () => {
    expect(bottomSpacerForLine(500, 1000, 400, 20)).toBe(0)
  })
})

describe('spacer invariants', () => {
  it('lands the last block on the top edge at the maximum scroll', () => {
    const viewportHeight = 500
    const articleHeight = 1000
    const lastTop = 950
    const topHeight = topSpacerHeight(viewportHeight, 32, 40)
    const bottomHeight = bottomSpacerHeight(viewportHeight, articleHeight, lastTop)
    const maxScroll = topHeight + articleHeight + bottomHeight - viewportHeight

    // 198 + 1000 + 450 - 500, and the block top at that scroll.
    expect(maxScroll).toBe(1148)
    expect(topHeight + lastTop - maxScroll).toBe(0)
  })

  it('still reaches the last block when the bottom spacer clamps to zero', () => {
    const viewportHeight = 500
    const articleHeight = 1000
    const lastTop = 400
    const topHeight = topSpacerHeight(viewportHeight, 32, 40)
    const maxScroll = topHeight + articleHeight + 0 - viewportHeight

    expect(bottomSpacerHeight(viewportHeight, articleHeight, lastTop)).toBe(0)
    expect(topHeight + lastTop).toBeLessThanOrEqual(maxScroll)
  })
})

describe('centerScrollTop', () => {
  it('puts the middle of the target in the middle of the viewport', () => {
    expect(
      centerScrollTop({ top: 1000, height: 100, viewportHeight: 500, scrollHeight: 6000 })
    ).toBe(800)
  })

  it('clamps to the top of the document', () => {
    expect(centerScrollTop({ top: 40, height: 100, viewportHeight: 500, scrollHeight: 6000 })).toBe(
      0
    )
  })

  it('clamps to the maximum scroll', () => {
    expect(
      centerScrollTop({ top: 5000, height: 100, viewportHeight: 500, scrollHeight: 2500 })
    ).toBe(2000)
  })

  it('centres the first row of a target taller than the viewport', () => {
    // The whole block would ask for 1250; its first row asks for 760.
    expect(
      centerScrollTop({
        top: 1000,
        height: 1000,
        firstRowHeight: 20,
        viewportHeight: 500,
        scrollHeight: 6000
      })
    ).toBe(760)
  })

  it('never asks for a negative scroll when the content is shorter than the viewport', () => {
    expect(centerScrollTop({ top: 0, height: 10, viewportHeight: 500, scrollHeight: 400 })).toBe(0)
  })
})
