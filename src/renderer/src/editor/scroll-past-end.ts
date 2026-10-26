import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

/**
 * Inline style that lets the last line scroll up to the top edge.
 *
 * Only `padding-bottom` is declared: the theme keeps its own top padding, which
 * is what the writer sees while typing. `editorHeight - lineHeight` is the exact
 * space that brings the last line to the top at the maximum scroll and no more,
 * so the free scroll stays finite.
 */
export function bottomScrollPadding(editorHeight: number, lineHeight: number): string {
  const bottom =
    editorHeight > 0 && lineHeight > 0 && editorHeight > lineHeight
      ? Math.ceil(editorHeight - lineHeight)
      : 0

  return `padding-bottom: ${bottom}px`
}

function paddingAttrs(view: EditorView): { style: string } {
  return { style: bottomScrollPadding(view.scrollDOM.clientHeight, view.defaultLineHeight) }
}

/**
 * The padding depends only on the height of the scroller, so it is recomputed
 * on geometry changes and never listens to scrolling.
 */
const paddingPlugin = ViewPlugin.fromClass(
  class {
    attrs: { style: string } | null

    constructor(readonly view: EditorView) {
      this.attrs = paddingAttrs(view)
    }

    update(update: ViewUpdate): void {
      if (!update.geometryChanged) return

      this.attrs = paddingAttrs(update.view)
    }
  }
)

/** Scroll past the last line, without centring the caret while typing. */
export const scrollPastEndSpace = [
  paddingPlugin,
  EditorView.contentAttributes.of((view) => view.plugin(paddingPlugin)?.attrs ?? null)
]
