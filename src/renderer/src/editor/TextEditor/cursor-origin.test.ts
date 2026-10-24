import { EditorState, type TransactionSpec } from '@codemirror/state'
import { describe, expect, it } from '@jest/globals'
import { pointerSelectionEnd } from '../pointer-selection'
import { cursorOrigin, type CursorUpdate } from './cursor-origin'

const DOC = 'one\ntwo\nthree\nfour'

/**
 * The flags `ViewUpdate` exposes, computed from a real transaction so the table
 * below exercises the same `docChanged` / `selectionSet` / `userEvent` reads the
 * editor does, without mounting a view.
 */
function updateFor(spec: TransactionSpec): CursorUpdate {
  const transaction = EditorState.create({ doc: DOC }).update(spec)

  return {
    docChanged: transaction.docChanged,
    selectionSet: transaction.selection !== undefined,
    transactions: [transaction]
  }
}

describe('cursorOrigin', () => {
  it('ignores an update that changes nothing, as focus, scroll or geometry do', () => {
    expect(cursorOrigin(updateFor({}))).toBeNull()
  })

  it('reports typing as keyboard', () => {
    expect(cursorOrigin(updateFor({ changes: { from: 0, insert: 'X' } }))).toBe('keyboard')
  })

  it('reports composition as keyboard', () => {
    expect(
      cursorOrigin(
        updateFor({ changes: { from: 0, insert: 'ñ' }, userEvent: 'input.type.compose' })
      )
    ).toBe('keyboard')
  })

  it('reports a caret moved by the arrow keys as keyboard', () => {
    expect(cursorOrigin(updateFor({ selection: { anchor: 2 }, userEvent: 'select' }))).toBe(
      'keyboard'
    )
  })

  it('reports an edit that also moves the caret as keyboard', () => {
    expect(
      cursorOrigin(
        updateFor({
          changes: { from: DOC.length, insert: ' five' },
          selection: { anchor: DOC.length + 5 }
        })
      )
    ).toBe('keyboard')
  })

  it('publishes nothing for a pointer selection that has not settled yet', () => {
    expect(
      cursorOrigin(updateFor({ selection: { anchor: 4 }, userEvent: 'select.pointer' }))
    ).toBeNull()
  })

  it('publishes nothing while a drag moves the caret', () => {
    const state = EditorState.create({ doc: DOC })
    const transactions = [4, 6, 8, 10].map((anchor) =>
      state.update({ selection: { anchor }, userEvent: 'select.pointer' })
    )

    expect(cursorOrigin({ docChanged: false, selectionSet: true, transactions })).toBeNull()
  })

  it('reports the gesture-closing transaction as pointer', () => {
    expect(cursorOrigin(updateFor({ annotations: pointerSelectionEnd.of(4) }))).toBe('pointer')
  })

  it('prefers the gesture end even when the closing transaction also edits', () => {
    expect(
      cursorOrigin(
        updateFor({
          changes: { from: 0, insert: 'X' },
          annotations: pointerSelectionEnd.of(4)
        })
      )
    ).toBe('pointer')
  })

  it('reports an edit carrying a pointer user event as keyboard', () => {
    expect(
      cursorOrigin(
        updateFor({
          changes: { from: 0, insert: 'X' },
          selection: { anchor: 1 },
          userEvent: 'select.pointer'
        })
      )
    ).toBe('keyboard')
  })

  it('finds the gesture-end annotation among several transactions', () => {
    const state = EditorState.create({ doc: DOC })
    const dragging = state.update({ selection: { anchor: 6 }, userEvent: 'select.pointer' })
    const settled = state.update({ annotations: pointerSelectionEnd.of(6) })

    expect(
      cursorOrigin({ docChanged: false, selectionSet: true, transactions: [dragging, settled] })
    ).toBe('pointer')
  })
})
