import { EditorView } from '@codemirror/view'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from '@jest/globals'
import { useEffect } from 'react'
import App from './App'
import { makeArticle, makeStory } from './data/fake/factories'
import { createFakePort } from './data/fake/fake-port'
import type { DataPort } from './data/port'
import { DataPortProvider } from './data/port-context'
import { useEditorStatus, type EditorCursor } from './state/status-store'

// Four lines, so every gesture below lands on a different one.
const TEXT = 'one\ntwo\nthree\nfour'

/**
 * Records every caret the store hands out, exactly as the status bar reads it.
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

function selectAt(head: number, userEvent?: string): void {
  act(() => {
    articleView().dispatch({ selection: { anchor: head }, userEvent })
  })
}

describe('cursor publication', () => {
  it('publishes nothing when the article opens', async () => {
    const log = await openArticle()

    expect(log).toHaveLength(0)
  })

  it('publishes a caret moved by a pointer selection', async () => {
    const log = await openArticle()

    selectAt(10, 'select.pointer')

    expect(log).toEqual([{ line: 3, column: 3, origin: 'pointer' }])
  })

  it('publishes every move of a drag', async () => {
    const log = await openArticle()

    for (const head of [5, 8, 10, 16]) {
      selectAt(head, 'select.pointer')
    }

    expect(log).toEqual([
      { line: 2, column: 2, origin: 'pointer' },
      { line: 3, column: 1, origin: 'pointer' },
      { line: 3, column: 3, origin: 'pointer' },
      { line: 4, column: 3, origin: 'pointer' }
    ])
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

    selectAt(2)
    log.length = 0

    act(() => {
      fireEvent.keyDown(view.contentDOM, { key: 'ArrowRight' })
    })

    expect(log).toEqual([{ line: 1, column: 4, origin: 'keyboard' }])
  })

  it('publishes nothing for focus and viewport updates', async () => {
    const log = await openArticle()
    const view = articleView()

    selectAt(2)
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

    expect(log).toHaveLength(0)
  })
})
