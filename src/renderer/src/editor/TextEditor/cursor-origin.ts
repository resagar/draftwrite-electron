import type { ViewUpdate } from '@codemirror/view'
import { isPointerGestureEnd } from '../pointer-selection'
import type { CursorOrigin } from '../../state/status-store'

/** The part of a `ViewUpdate` the origin is decided from. */
export type CursorUpdate = Pick<ViewUpdate, 'docChanged' | 'selectionSet' | 'transactions'>

/**
 * Where a caret came from, or `null` when the update must not be published.
 *
 * `EditorStatus.cursor` holds settled carets only, so the preview never has to
 * know about a gesture in progress:
 *
 * - the gesture-closing transaction (see `pointer-selection.ts`) is `pointer`;
 * - any document change is `keyboard` (typing, paste, undo, the format toolbar);
 * - a pointer selection that has not settled yet — the drag itself, or a
 *   pointer selection originated outside the content — is `null`;
 * - any other selection change is `keyboard` (arrows, Home/End, PageUp/Down);
 * - an update with neither a document nor a selection change is `null`: focus,
 *   scroll, geometry and resize must not move the preview.
 */
export function cursorOrigin(update: CursorUpdate): CursorOrigin | null {
  if (isPointerGestureEnd(update)) {
    return 'pointer'
  }

  if (update.docChanged) {
    return 'keyboard'
  }

  if (!update.selectionSet) {
    return null
  }

  const pointerSelection = update.transactions.some((transaction) =>
    transaction.isUserEvent('select.pointer')
  )

  return pointerSelection ? null : 'keyboard'
}
