import { EditorState } from '@codemirror/state'
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

/**
 * Turns the scroll a transaction already asks for into a vertical centering of
 * the caret. It adds no transaction of its own and never touches the document
 * or the selection.
 */
export const typewriterScroll = EditorState.transactionExtender.of((tr) => {
  if (!tr.scrollIntoView) return null

  return {
    effects: EditorView.scrollIntoView(tr.newSelection.main.head, { y: 'center' })
  }
})

export interface TypewriterPadding {
  top: number
  bottom: number
}

/**
 * The vertical padding that replaces the theme's one on `.cm-content`.
 *
 * `top` centers the first line with `scrollTop = 0`; `bottom` lets the last
 * line reach the top edge of the scroller while `editorHeight - lineHeight`
 * pixels of blank space stay below it, and keeps the scroll range finite.
 * `top` is rounded and `bottom` ceiled so the padding stays in whole pixels.
 */
export function computeTypewriterPadding(
  editorHeight: number,
  lineHeight: number
): TypewriterPadding {
  if (editorHeight <= 0 || lineHeight <= 0 || editorHeight <= lineHeight) {
    return { top: 0, bottom: 0 }
  }

  return {
    top: Math.round((editorHeight - lineHeight) / 2),
    bottom: Math.ceil(editorHeight - lineHeight)
  }
}

export function typewriterPaddingStyle(editorHeight: number, lineHeight: number): string | null {
  const { top, bottom } = computeTypewriterPadding(editorHeight, lineHeight)

  if (top === 0 && bottom === 0) return null

  return `padding-top: ${top}px; padding-bottom: ${bottom}px`
}

function typewriterPaddingAttrs(view: EditorView): { style: string } | null {
  const style = typewriterPaddingStyle(view.scrollDOM.clientHeight, view.defaultLineHeight)

  return style === null ? null : { style }
}

/**
 * The padding depends only on the height of the scroller, so it is recomputed
 * on geometry changes and never listens to scrolling.
 */
const paddingPlugin = ViewPlugin.fromClass(
  class {
    attrs: { style: string } | null

    constructor(readonly view: EditorView) {
      this.attrs = typewriterPaddingAttrs(view)
    }

    update(update: ViewUpdate): void {
      if (!update.geometryChanged) return

      this.attrs = typewriterPaddingAttrs(update.view)
    }
  }
)

export const typewriterPadding = [
  paddingPlugin,
  EditorView.contentAttributes.of((view) => view.plugin(paddingPlugin)?.attrs ?? null)
]

/**
 * Typewriter scroll for the shared editor: the caret stays in the vertical
 * center while typing and the asymmetric padding makes the whole document
 * reachable. Both Story and Article get it through `articleEditorExtensions`.
 */
export const typewriter = [typewriterScroll, ...typewriterPadding]
