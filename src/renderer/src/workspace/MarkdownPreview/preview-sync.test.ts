import { afterEach, describe, expect, it, jest } from '@jest/globals'
import {
  bottomSpacerHeight,
  centerScrollTop,
  findBlockForLine,
  findTarget,
  keepContiguousRows,
  lineRect,
  measurePreviewSync,
  readSourceBlocks,
  topSpacerHeight,
  type Rect,
  type SourceBlock
} from './preview-sync'

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

const row = (top: number, height = 16, left = 0, width = 200): Rect => ({
  top,
  bottom: top + height,
  left,
  width,
  height
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

describe('lineRect', () => {
  // jsdom has no layout, so the rows of the range are injected. The test setup
  // defines `getClientRects` as non-writable, so it is redefined, not spied.
  const stubRows = (rows: Rect[]): void => {
    Object.defineProperty(Range.prototype, 'getClientRects', {
      configurable: true,
      value: () => rows as unknown as DOMRectList
    })
  }

  afterEach(() => {
    stubRows([])
  })

  it('unions the visual rows of the line and keeps the height of its first row', () => {
    const article = renderArticle()
    const anchor = article.querySelector('[data-source-line="2"]') as HTMLElement
    const next = article.querySelector<HTMLElement>('[data-source-line="3"]')
    stubRows([row(100), row(124)])

    expect(lineRect(anchor, next)).toEqual({
      top: 100,
      bottom: 140,
      left: 0,
      width: 200,
      height: 40,
      firstRowHeight: 16
    })
  })

  it('falls back to the marker rect when the range has no rows', () => {
    const article = renderArticle()
    const anchor = article.querySelector('[data-source-line="2"]') as HTMLElement
    stubRows([])

    // jsdom reports a zero rect for every element.
    expect(lineRect(anchor, null)).toMatchObject({ top: 0, height: 0, firstRowHeight: 0 })
  })

  it('measures the marker itself when it is not inside an inline block', () => {
    document.body.innerHTML = '<article><div><span data-source-line="1"></span></div></article>'
    const anchor = document.querySelector('[data-source-line="1"]') as HTMLElement
    const spy = jest.spyOn(anchor, 'getBoundingClientRect')

    lineRect(anchor, null)

    expect(spy).toHaveBeenCalled()
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
    expect(centerScrollTop({ top: 1000, height: 100, viewportHeight: 500, maxScroll: 5000 })).toBe(
      800
    )
  })

  it('clamps to the top of the document', () => {
    expect(centerScrollTop({ top: 40, height: 100, viewportHeight: 500, maxScroll: 5000 })).toBe(0)
  })

  it('clamps to the maximum scroll', () => {
    expect(centerScrollTop({ top: 5000, height: 100, viewportHeight: 500, maxScroll: 2000 })).toBe(
      2000
    )
  })

  it('centres the first row of a target taller than the viewport', () => {
    // The whole block would ask for 1250; its first row asks for 760.
    expect(
      centerScrollTop({
        top: 1000,
        height: 1000,
        firstRowHeight: 20,
        viewportHeight: 500,
        maxScroll: 5000
      })
    ).toBe(760)
  })

  it('never asks for a negative scroll', () => {
    expect(centerScrollTop({ top: 0, height: 10, viewportHeight: 500, maxScroll: -100 })).toBe(0)
  })
})

type StubRect = { top: number; height: number }

const stubRect = (element: HTMLElement, { top, height }: StubRect): void => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      top,
      bottom: top + height,
      height,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: top,
      toJSON: () => ({})
    })
  })
}

const stubNumber = (
  element: HTMLElement,
  property: 'clientHeight' | 'scrollHeight' | 'scrollTop',
  value: number
): void => {
  Object.defineProperty(element, property, { configurable: true, value, writable: true })
}

const syncFixture = (): {
  container: HTMLElement
  article: HTMLElement
  topSpacer: HTMLElement
  bottomSpacer: HTMLElement
} => {
  document.body.innerHTML = `
    <section>
      <div data-preview-spacer="top"></div>
      <article>
        <p data-source-start-line="1" data-source-end-line="1"><span data-source-line="1"></span>text</p>
        <hr data-source-start-line="5" data-source-end-line="5">
      </article>
      <div data-preview-spacer="bottom"></div>
    </section>
  `

  const container = document.querySelector('section') as HTMLElement
  const article = container.querySelector('article') as HTMLElement
  const topSpacer = container.querySelector('[data-preview-spacer="top"]') as HTMLElement
  const bottomSpacer = container.querySelector('[data-preview-spacer="bottom"]') as HTMLElement

  stubRect(container, { top: 0, height: 500 })
  stubNumber(container, 'clientHeight', 500)
  stubNumber(container, 'scrollHeight', 5000)
  stubNumber(container, 'scrollTop', 1000)
  stubRect(article, { top: 100, height: 600 })
  stubRect(article.querySelector('p') as HTMLElement, { top: 132, height: 40 })
  stubRect(article.querySelector('hr') as HTMLElement, { top: 400, height: 20 })
  stubRect(article.querySelector('[data-source-line="1"]') as HTMLElement, {
    top: 700,
    height: 40
  })

  return { container, article, topSpacer, bottomSpacer }
}

describe('measurePreviewSync', () => {
  it('measures the spacers and the destination in content coordinates', () => {
    const { container, article, topSpacer, bottomSpacer } = syncFixture()

    const measurement = measurePreviewSync({
      container,
      article,
      topSpacer,
      bottomSpacer,
      line: 1
    })

    // T = 250 - 32 - 20; B = 500 - (600 - 300).
    expect(topSpacer.style.height).toBe('198px')
    expect(bottomSpacer.style.height).toBe('200px')
    expect(measurement).toEqual({ topSpacer: 198, target: 1470, lineUnit: 40 })
    // The write belongs to the caller; measuring never scrolls.
    expect(container.scrollTop).toBe(1000)
  })

  it('writes the spacers but no destination when there is no cursor line', () => {
    const { container, article, topSpacer, bottomSpacer } = syncFixture()

    const measurement = measurePreviewSync({
      container,
      article,
      topSpacer,
      bottomSpacer,
      line: null
    })

    expect(measurement).toEqual({ topSpacer: 198, target: null, lineUnit: 22 })
    expect(bottomSpacer.style.height).toBe('200px')
  })

  it('measures nothing without a viewport, as in jsdom or a hidden pane', () => {
    const { container, article, topSpacer, bottomSpacer } = syncFixture()
    stubNumber(container, 'clientHeight', 0)

    expect(measurePreviewSync({ container, article, topSpacer, bottomSpacer, line: 1 })).toBeNull()
    expect(topSpacer.style.height).toBe('')
  })

  it('zeroes the spacers for a document with no annotated blocks', () => {
    const { container, article, topSpacer, bottomSpacer } = syncFixture()
    article.innerHTML = '<p>plain</p>'
    topSpacer.style.height = '50px'

    expect(measurePreviewSync({ container, article, topSpacer, bottomSpacer, line: 1 })).toEqual({
      topSpacer: 0,
      target: null,
      lineUnit: 22
    })
    expect(topSpacer.style.height).toBe('0px')
    expect(bottomSpacer.style.height).toBe('0px')
  })
})
