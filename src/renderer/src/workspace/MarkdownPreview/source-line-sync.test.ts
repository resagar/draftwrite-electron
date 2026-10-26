import type { EditorView } from '@codemirror/view'
import { describe, expect, it } from '@jest/globals'
import {
  anchorForLine,
  bindLineScrollSync,
  buildPreviewLineIndex,
  editorToPreview,
  entryAtTop,
  previewToEditor,
  type FrameScheduler,
  type PreviewLineIndex
} from './source-line-sync'

const index = (): PreviewLineIndex => ({
  byLine: new Map([
    [1, 32],
    [2, 64]
  ]),
  ordered: [
    { line: 1, top: 32 },
    { line: 2, top: 64 }
  ],
  blocks: [
    {
      start: 1,
      end: 3,
      top: 20,
      markers: [
        { line: 1, top: 32 },
        { line: 2, top: 64 }
      ]
    }
  ],
  nextTopByLine: new Map([
    [1, 64],
    [2, 64]
  ])
})

describe('anchorForLine', () => {
  it('uses the exact marker of the line', () => {
    expect(anchorForLine(index(), 1)).toEqual({ line: 1, top: 32, nextTop: 64 })
  })

  it('falls back to the nearest marker inside the block', () => {
    expect(anchorForLine(index(), 3)).toEqual({ line: 2, top: 64, nextTop: 64 })
  })

  it('falls back to the block top when it renders no marked text', () => {
    const withoutMarkers: PreviewLineIndex = {
      byLine: new Map(),
      ordered: [],
      blocks: [{ start: 5, end: 5, top: 120, markers: [] }],
      nextTopByLine: new Map()
    }

    expect(anchorForLine(withoutMarkers, 5)).toEqual({ line: 5, top: 120, nextTop: 120 })
  })

  it('uses the nearest marker for a line outside every block', () => {
    const trailing: PreviewLineIndex = {
      byLine: new Map([[1, 32]]),
      ordered: [{ line: 1, top: 32 }],
      blocks: [],
      nextTopByLine: new Map([[1, 32]])
    }

    expect(anchorForLine(trailing, 9)).toEqual({ line: 1, top: 32, nextTop: 32 })
  })

  it('is null without rendered markers', () => {
    expect(
      anchorForLine({ byLine: new Map(), ordered: [], blocks: [], nextTopByLine: new Map() }, 2)
    ).toBeNull()
  })
})

describe('entryAtTop', () => {
  it('returns the last line at or above the scroll position', () => {
    expect(entryAtTop(index(), 0)?.line).toBe(1)
    expect(entryAtTop(index(), 40)?.line).toBe(1)
    expect(entryAtTop(index(), 64)?.line).toBe(2)
  })

  it('keeps the last marker past the end of the document', () => {
    expect(entryAtTop(index(), 500)?.line).toBe(2)
  })

  it('is null without rendered markers', () => {
    expect(
      entryAtTop({ byLine: new Map(), ordered: [], blocks: [], nextTopByLine: new Map() }, 0)
    ).toBeNull()
  })
})

/** Three lines of 32 px with a 16 px top padding, enough for the interpolation. */
function fakeView(): EditorView {
  const block = (line: number): { from: number; top: number; height: number } => ({
    from: (line - 1) * 10,
    top: (line - 1) * 32,
    height: 32
  })

  return {
    documentPadding: { top: 16 },
    state: {
      doc: {
        lines: 3,
        lineAt: (pos: number) => ({ number: Math.min(3, Math.floor(pos / 10) + 1) }),
        line: (number: number) => ({ from: (number - 1) * 10 })
      }
    },
    lineBlockAtHeight: (height: number) => block(height < 48 ? 1 : height < 80 ? 2 : 3),
    lineBlockAt: (pos: number) => block(Math.min(3, Math.floor(pos / 10) + 1))
  } as unknown as EditorView
}

describe('editorToPreview', () => {
  it('interpolates through the top padding and then inside the line', () => {
    const view = fakeView()

    expect(editorToPreview(view, index(), 0, 200)).toBe(0)
    expect(editorToPreview(view, index(), 8, 200)).toBe(16)
    expect(editorToPreview(view, index(), 16, 200)).toBe(32)
    expect(editorToPreview(view, index(), 32, 200)).toBe(48)
  })

  it('is continuous across a line boundary and lands on the next line', () => {
    expect(editorToPreview(fakeView(), index(), 46, 200)).toBe(62)
    expect(editorToPreview(fakeView(), index(), 48, 200)).toBe(64)
  })

  it('clamps to the preview scroll range', () => {
    expect(editorToPreview(fakeView(), index(), 32, 40)).toBe(40)
  })
})

describe('previewToEditor', () => {
  it('interpolates through the preview padding and then inside the line', () => {
    const view = fakeView()

    expect(previewToEditor(view, index(), 0, 200)).toBe(0)
    expect(previewToEditor(view, index(), 16, 200)).toBe(8)
    expect(previewToEditor(view, index(), 32, 200)).toBe(16)
    expect(previewToEditor(view, index(), 48, 200)).toBe(32)
  })

  it('is continuous across a line boundary and lands on the next line', () => {
    expect(previewToEditor(fakeView(), index(), 62, 200)).toBe(46)
    expect(previewToEditor(fakeView(), index(), 64, 200)).toBe(48)
  })

  it('clamps to the editor scroll range', () => {
    expect(previewToEditor(fakeView(), index(), 48, 20)).toBe(20)
  })
})

describe('buildPreviewLineIndex', () => {
  it('reads markers and block anchors in content coordinates', () => {
    const container = document.createElement('div')
    const article = document.createElement('article')
    article.innerHTML =
      '<p data-source-start-line="1" data-source-end-line="2">' +
      '<span data-source-line="1"></span>one<br><span data-source-line="2"></span>two</p>'
    container.appendChild(article)
    document.body.appendChild(container)

    const rect = (top: number, height = 32): DOMRect =>
      ({
        top,
        bottom: top + height,
        height,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
        y: top,
        toJSON: () => ({})
      }) as DOMRect

    Object.defineProperty(container, 'getBoundingClientRect', { value: () => rect(0, 500) })
    Object.defineProperty(article.querySelector('p'), 'getBoundingClientRect', {
      value: () => rect(32, 64)
    })
    const markers = article.querySelectorAll('span')
    Object.defineProperty(markers[0], 'getBoundingClientRect', { value: () => rect(32) })
    Object.defineProperty(markers[1], 'getBoundingClientRect', { value: () => rect(64) })

    const built = buildPreviewLineIndex(container, article)

    expect(built.byLine.get(1)).toBe(32)
    expect(built.byLine.get(2)).toBe(64)
    expect(built.nextTopByLine.get(1)).toBe(64)
    expect(built.nextTopByLine.get(2)).toBe(64)
    expect(built.blocks[0]).toMatchObject({ start: 1, end: 2, top: 32 })

    container.remove()
  })
})

/** A real element whose geometry and scroll position the test controls. */
function scroller(options: { clientHeight: number; scrollHeight: number }): HTMLElement {
  const element = document.createElement('div')
  let position = 0

  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    get: () => position,
    set: (value: number) => {
      position = value
    }
  })
  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    value: options.clientHeight
  })
  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    value: options.scrollHeight
  })

  return element
}

function emitScroll(element: HTMLElement): void {
  element.dispatchEvent(new Event('scroll'))
}

/** Writes instantly, as `prefers-reduced-motion` does. */
const instant: FrameScheduler = {
  now: () => 0,
  request: () => 1,
  cancel: () => undefined,
  reducedMotion: () => true
}

/** Frames the test advances by hand. */
function manualScheduler(): FrameScheduler & { advance: (ms: number) => void } {
  let time = 0
  let nextId = 1
  const queue = new Map<number, (time: number) => void>()

  return {
    now: () => time,
    request: (callback) => {
      const id = nextId
      nextId += 1
      queue.set(id, callback)

      return id
    },
    cancel: (handle) => {
      queue.delete(handle)
    },
    reducedMotion: () => false,
    advance: (ms) => {
      time += ms
      const callbacks = [...queue.values()]
      queue.clear()
      for (const callback of callbacks) callback(time)
    }
  }
}

describe('bindLineScrollSync', () => {
  const map = {
    toPreview: (top: number) => top * 2,
    toEditor: (top: number) => top / 2
  }

  it('maps both directions and ignores the echoes of its own writes', () => {
    const editor = scroller({ clientHeight: 500, scrollHeight: 1500 })
    const preview = scroller({ clientHeight: 400, scrollHeight: 2400 })

    bindLineScrollSync(editor, preview, map, instant)

    editor.scrollTop = 100
    emitScroll(editor)
    expect(preview.scrollTop).toBe(200)

    // The preview did not move: this is its own echo.
    emitScroll(preview)
    expect(editor.scrollTop).toBe(100)

    preview.scrollTop = 300
    emitScroll(preview)
    expect(editor.scrollTop).toBe(150)

    // The editor did not move: this is its own echo.
    emitScroll(editor)
    expect(preview.scrollTop).toBe(300)
  })

  it('animates the driven pane instead of jumping', () => {
    const editor = scroller({ clientHeight: 500, scrollHeight: 1500 })
    const preview = scroller({ clientHeight: 400, scrollHeight: 2400 })
    const scheduler = manualScheduler()

    bindLineScrollSync(editor, preview, map, scheduler)

    editor.scrollTop = 100
    emitScroll(editor)
    expect(preview.scrollTop).toBe(0)

    scheduler.advance(75)
    expect(preview.scrollTop).toBeCloseTo(175, 5)

    scheduler.advance(75)
    expect(preview.scrollTop).toBe(200)

    // The final echo does not bounce back.
    emitScroll(preview)
    expect(editor.scrollTop).toBe(100)
  })

  it('retargets a running flight from the live position', () => {
    const editor = scroller({ clientHeight: 500, scrollHeight: 1500 })
    const preview = scroller({ clientHeight: 400, scrollHeight: 2400 })
    const scheduler = manualScheduler()

    bindLineScrollSync(editor, preview, map, scheduler)

    editor.scrollTop = 100
    emitScroll(editor)
    scheduler.advance(75)

    editor.scrollTop = 150
    emitScroll(editor)
    scheduler.advance(75)
    scheduler.advance(75)

    expect(preview.scrollTop).toBe(300)
  })

  it('lets the user take over by cancelling the flight', () => {
    const editor = scroller({ clientHeight: 500, scrollHeight: 1500 })
    const preview = scroller({ clientHeight: 400, scrollHeight: 2400 })
    const scheduler = manualScheduler()

    bindLineScrollSync(editor, preview, map, scheduler)

    editor.scrollTop = 100
    emitScroll(editor)
    scheduler.advance(75)
    const midway = preview.scrollTop

    preview.dispatchEvent(new Event('wheel'))
    scheduler.advance(150)

    expect(preview.scrollTop).toBe(midway)
  })

  it('realigns the preview from the editor on demand', () => {
    const editor = scroller({ clientHeight: 500, scrollHeight: 1500 })
    const preview = scroller({ clientHeight: 400, scrollHeight: 2400 })
    const binding = bindLineScrollSync(editor, preview, map, instant)

    editor.scrollTop = 100
    binding.realign()

    expect(preview.scrollTop).toBe(200)

    binding.stop()
  })

  it('stops listening after cleanup', () => {
    const editor = scroller({ clientHeight: 500, scrollHeight: 1500 })
    const preview = scroller({ clientHeight: 400, scrollHeight: 2400 })
    const binding = bindLineScrollSync(editor, preview, map, instant)

    binding.stop()
    editor.scrollTop = 100
    emitScroll(editor)

    expect(preview.scrollTop).toBe(0)
  })
})
