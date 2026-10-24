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
 * Window, in milliseconds, in which the mouse events a browser fires after a
 * touch are read as the tail of that touch. Only used when the event cannot
 * answer the question itself through `sourceCapabilities`.
 */
const COMPATIBILITY_MOUSE_WINDOW = 500

/**
 * The slice of a mouse event the compatibility guard needs.
 *
 * `sourceCapabilities` is Chromium's answer to "did a finger cause this?"; the
 * DOM lib of this project does not declare it on `MouseEvent`, so it is
 * optional here and read defensively. jsdom does not implement it either.
 */
export type MouseEventCapabilities = {
  readonly sourceCapabilities?: { readonly firesTouchEvents?: boolean } | null
  readonly timeStamp: number
}

/**
 * True for the compatibility `mousedown`/`mouseup` a browser fires after a tap.
 *
 * A tap is `touchstart → touchend → mousedown → mouseup`, and the last two are
 * synthetic: closing the gesture with them would centre a second time.
 * `sourceCapabilities.firesTouchEvents` is the exact answer; the timestamp is
 * the fallback for the engines that do not implement it. `lastTouchAt` starts
 * at `-Infinity`, so a mouse gesture with no touch before it is never filtered.
 */
export function isCompatibilityMouse(event: MouseEventCapabilities, lastTouchAt: number): boolean {
  if (event.sourceCapabilities?.firesTouchEvents === true) return true

  return event.timeStamp - lastTouchAt < COMPATIBILITY_MOUSE_WINDOW
}

/**
 * Centers the caret when a pointer gesture ends, and only then: clicking
 * somewhere else, clicking inside an existing selection and releasing a drag
 * all publish a single transaction, so the viewport never moves under the
 * mouse while the writer is selecting.
 *
 * The gesture is armed by the press and not by the release: `mousedown` for the
 * mouse, `touchstart` for a finger. Arming only on `mousedown` would depend on
 * the synthetic mouse pair a tap usually produces, and a touch that scrolls or
 * turns into a long press never gets one, so the caret would stay uncentred.
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
  /** `timeStamp` of the last touch event, for the compatibility guard. */
  private lastTouchAt = Number.NEGATIVE_INFINITY

  constructor(private readonly view: EditorView) {
    view.contentDOM.addEventListener('mousedown', this.onMouseDown)
    // Passive: the editor never prevents the default of a touch, it only notes
    // that a gesture on the content started.
    view.contentDOM.addEventListener('touchstart', this.onTouchStart, { passive: true })

    // Registered on the document, not on the content: a drag can end outside
    // the editor and still has to publish its final caret.
    const doc = view.contentDOM.ownerDocument
    doc.addEventListener('mouseup', this.onMouseUp)
    doc.addEventListener('touchend', this.onTouchEnd, { passive: true })
  }

  private onTouchStart = (event: Event): void => {
    this.lastTouchAt = event.timeStamp

    if (!this.view.contentDOM.contains(event.target as Node)) return

    this.armed = true
  }

  private onMouseDown = (event: MouseEvent): void => {
    // The pair the browser fires after a tap is not a new gesture.
    if (isCompatibilityMouse(event, this.lastTouchAt)) return
    // The context menu and the middle button must not move the viewport.
    if (event.button !== 0) return
    if (!this.view.contentDOM.contains(event.target as Node)) return

    this.armed = true
  }

  private onTouchEnd = (event: Event): void => {
    // Recorded before closing: the synthetic mouse events arrive right after
    // this one and must be recognised by the guard.
    this.lastTouchAt = event.timeStamp
    this.close()
  }

  private onMouseUp = (event: MouseEvent): void => {
    if (isCompatibilityMouse(event, this.lastTouchAt)) return

    this.close()
  }

  private close(): void {
    if (!this.armed) return

    // Clearing the flag here is what keeps a gesture from centering twice: of
    // `touchend` and the synthetic `mouseup` that follows it, the first one
    // closes the gesture and the guard drops the second one.
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
    this.view.contentDOM.removeEventListener('touchstart', this.onTouchStart)
    doc.removeEventListener('mouseup', this.onMouseUp)
    doc.removeEventListener('touchend', this.onTouchEnd)
  }
}

/**
 * Module-level constant: `@uiw/react-codemirror` reconfigures the editor on
 * every render, and only a stable plugin spec survives a reconfiguration with
 * its in-flight gesture.
 */
export const pointerGesture = ViewPlugin.fromClass(PointerGesture)
