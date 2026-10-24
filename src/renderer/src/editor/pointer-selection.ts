import { Annotation } from '@codemirror/state'
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

/**
 * Marks the transaction that closes a pointer gesture: a click or the release
 * of a drag. It is the only place where the editor tells the rest of the app
 * that the caret moved because of the mouse, and it always carries the final
 * `head`, once CodeMirror has settled the selection.
 */
export const pointerSelectionEnd = Annotation.define<number>()

/** True for the update produced by the gesture-closing transaction. */
export function isPointerGestureEnd(update: Pick<ViewUpdate, 'transactions'>): boolean {
  return update.transactions.some(
    (transaction) => transaction.annotation(pointerSelectionEnd) !== undefined
  )
}

/**
 * Centers the caret when a pointer gesture ends, and only then: clicking
 * somewhere else, clicking inside an existing selection and releasing a drag
 * all publish a single transaction, so the viewport never moves under the
 * mouse while the writer is selecting.
 *
 * The release is seen one frame late on purpose. CodeMirror dispatches the
 * pointer selection in `mousedown` when the click is outside the selection,
 * but in the document `mouseup` when it falls inside one, and a drag produces
 * one transaction per move. None of those is a gesture end, and a listener on
 * `contentDOM` would run before the document `mouseup` that finalizes the
 * selection. One `requestAnimationFrame` after the release the selection is
 * final, whatever the gesture was.
 */
class PointerGesture {
  private armed = false
  private frame = 0

  constructor(private readonly view: EditorView) {
    view.contentDOM.addEventListener('mousedown', this.onMouseDown)

    // Registered on the document, not on the content: a drag can end outside
    // the editor and still has to publish its final caret.
    const doc = view.contentDOM.ownerDocument
    doc.addEventListener('mouseup', this.onGestureEnd)
    doc.addEventListener('touchend', this.onGestureEnd, { passive: true })
  }

  private onMouseDown = (event: MouseEvent): void => {
    // The context menu and the middle button must not move the viewport.
    if (event.button !== 0) return
    if (!this.view.contentDOM.contains(event.target as Node)) return

    this.armed = true
  }

  private onGestureEnd = (): void => {
    if (!this.armed) return

    // Clearing the flag here is what keeps a touch gesture from centering
    // twice: the browser follows `touchend` with a synthetic `mouseup`, and the
    // first of the two closes the gesture.
    this.armed = false
    this.schedule()
  }

  private schedule(): void {
    const win = this.view.contentDOM.ownerDocument.defaultView ?? window

    // A second release before the frame runs must not add a second centering.
    if (this.frame) win.cancelAnimationFrame(this.frame)

    this.frame = win.requestAnimationFrame(() => {
      this.frame = 0
      if (!this.view.dom.isConnected) return

      const head = this.view.state.selection.main.head

      // One transaction does both jobs: the effect centers the editor and the
      // annotation tells the store that this caret is settled. No geometry
      // guard here: a hidden editor must still publish its caret.
      this.view.dispatch({
        annotations: [pointerSelectionEnd.of(head)],
        effects: EditorView.scrollIntoView(head, { y: 'center' })
      })
    })
  }

  destroy(): void {
    const win = this.view.contentDOM.ownerDocument.defaultView ?? window

    if (this.frame) {
      win.cancelAnimationFrame(this.frame)
      this.frame = 0
    }

    const doc = this.view.contentDOM.ownerDocument
    this.view.contentDOM.removeEventListener('mousedown', this.onMouseDown)
    doc.removeEventListener('mouseup', this.onGestureEnd)
    doc.removeEventListener('touchend', this.onGestureEnd)
  }
}

/**
 * Module-level constant: `@uiw/react-codemirror` reconfigures the editor on
 * every render, and only a stable plugin spec survives a reconfiguration with
 * its in-flight gesture.
 */
export const pointerGesture = ViewPlugin.fromClass(PointerGesture)
