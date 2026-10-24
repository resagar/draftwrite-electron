import { EditorView } from '@codemirror/view'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import { useEffect } from 'react'
import App from './App'
import { makeArticle, makeStory } from './data/fake/factories'
import { createFakePort } from './data/fake/fake-port'
import type { DataPort } from './data/port'
import { DataPortProvider } from './data/port-context'
import { useEditorStatus, type EditorCursor } from './state/status-store'

// Four lines, so every gesture below lands on a different one.
const TEXT = 'one\ntwo\nthree\nfour'
const LINE_THREE = 10
const LINE_FOUR = 16

/**
 * Records every caret the store hands out, exactly as the status bar reads it.
 * The store is the seam: it is where "which carets are settled" is decided, and
 * the preview reads the same value through `usePreviewLine`.
 */
function CursorProbe({ log }: { log: EditorCursor[] }): null {
  const { cursor } = useEditorStatus()

  useEffect(() => {
    if (cursor !== null) {
      log.push(cursor)
    }
  }, [cursor, log])

  return null
}

function renderAppWithCursorLog(port: DataPort, log: EditorCursor[]): ReturnType<typeof render> {
  return render(
    <DataPortProvider port={port}>
      <App />
      <CursorProbe log={log} />
    </DataPortProvider>
  )
}

async function openArticle(): Promise<EditorCursor[]> {
  const log: EditorCursor[] = []

  renderAppWithCursorLog(
    createFakePort({
      stories: [makeStory({ ID: 's1', Topic: 'Calm software' })],
      articles: [makeArticle({ ID: 'a1', StoryID: 's1', Title: 'The calm', Text: TEXT })]
    }).port,
    log
  )
  fireEvent.click(screen.getByRole('button', { name: 'Articles' }))
  fireEvent.click(await screen.findByRole('option', { name: /The calm/ }))
  await screen.findByRole('textbox', { name: 'Article text' })

  return log
}

function articleView(): EditorView {
  const content = document.querySelector<HTMLElement>('.cm-content')
  const view = content === null ? null : EditorView.findFromDOM(content)

  if (view === null) {
    throw new Error('The editor is not mounted')
  }

  return view
}

/**
 * One of the transactions CodeMirror dispatches while the pointer is held: a
 * pointer-originated selection change with no gesture end.
 */
function dragTo(head: number): void {
  act(() => {
    articleView().dispatch({ selection: { anchor: head }, userEvent: 'select.pointer' })
  })
}

// jsdom's frame clock runs in real time. Capturing it here keeps the test
// deterministic: the gesture-end frame is the queue this flushes.
let frames: FrameRequestCallback[] = []

function flushFrames(): void {
  const pending = frames
  frames = []

  act(() => {
    for (const callback of pending) callback(0)
  })
}

function pressMouse(): void {
  act(() => {
    fireEvent.mouseDown(articleView().contentDOM)
  })
}

function releaseMouse(): void {
  act(() => {
    fireEvent.mouseUp(articleView().contentDOM.ownerDocument)
  })
}

describe('cursor publication', () => {
  const realRequestAnimationFrame = window.requestAnimationFrame
  const realCancelAnimationFrame = window.cancelAnimationFrame

  beforeEach(() => {
    frames = []
    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      frames.push(callback)

      return frames.length
    }
    window.cancelAnimationFrame = (): void => {
      frames = []
    }
  })

  afterEach(() => {
    window.requestAnimationFrame = realRequestAnimationFrame
    window.cancelAnimationFrame = realCancelAnimationFrame
  })

  it('publishes nothing while nothing changes, then the settled click once at release', async () => {
    const log = await openArticle()

    pressMouse()
    expect(log).toHaveLength(0)

    // The click landed on the third line: CodeMirror's pointer selection, which
    // is not a settled caret yet.
    dragTo(LINE_THREE)
    expect(log).toHaveLength(0)

    releaseMouse()
    // Still nothing: the gesture closes one frame later, once the selection is
    // final even when the click landed inside an existing one.
    expect(log).toHaveLength(0)

    flushFrames()

    expect(log).toEqual([{ line: 3, column: 3, origin: 'pointer' }])
  })

  it('publishes nothing during a drag and publishes once, with the final line, on release', async () => {
    const log = await openArticle()

    pressMouse()
    for (const head of [5, 8, LINE_THREE, LINE_FOUR]) {
      dragTo(head)
    }
    expect(log).toHaveLength(0)

    releaseMouse()
    expect(log).toHaveLength(0)

    flushFrames()

    expect(log).toEqual([{ line: 4, column: 3, origin: 'pointer' }])
  })

  it('publishes a caret moved by typing as keyboard', async () => {
    const log = await openArticle()
    const view = articleView()

    act(() => {
      view.dispatch({
        changes: { from: view.state.doc.length, insert: '\nfive' },
        selection: { anchor: view.state.doc.length + 5 }
      })
    })

    expect(log).toEqual([{ line: 5, column: 5, origin: 'keyboard' }])
  })

  it('publishes a caret moved by the arrow keys as keyboard', async () => {
    const log = await openArticle()
    const view = articleView()

    act(() => {
      view.dispatch({ selection: { anchor: 2 } })
    })
    log.length = 0

    act(() => {
      fireEvent.keyDown(view.contentDOM, { key: 'ArrowRight' })
    })

    expect(log).toEqual([{ line: 1, column: 4, origin: 'keyboard' }])
  })

  it('publishes nothing for focus and viewport updates', async () => {
    const log = await openArticle()
    const view = articleView()

    act(() => {
      view.dispatch({ selection: { anchor: 2 } })
    })
    log.length = 0

    act(() => {
      view.focus()
    })
    act(() => {
      view.dispatch({ effects: EditorView.scrollIntoView(2) })
    })
    act(() => {
      view.contentDOM.scrollTop = 40
    })
    flushFrames()

    expect(log).toHaveLength(0)
  })
})
