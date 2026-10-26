import type { ViewUpdate } from '@codemirror/view'
import type { CursorOrigin } from '../../state/status-store'

/** The part of a `ViewUpdate` the origin is decided from. */
export type CursorUpdate = Pick<ViewUpdate, 'docChanged' | 'selectionSet' | 'transactions'>

/**
 * Where a caret came from, or `null` when the update must not be published.
 *
 * The status bar reads the published line and column, so every settled caret
 * publishes: typing and key commands as `keyboard`, pointer selections as
 * `pointer`. Focus, scroll, geometry and resize changes publish nothing.
 */
export function cursorOrigin(update: CursorUpdate): CursorOrigin | null {
  if (update.docChanged) {
    return 'keyboard'
  }

  if (!update.selectionSet) {
    return null
  }

  const pointerSelection = update.transactions.some((transaction) =>
    transaction.isUserEvent('select.pointer')
  )

  return pointerSelection ? 'pointer' : 'keyboard'
}
