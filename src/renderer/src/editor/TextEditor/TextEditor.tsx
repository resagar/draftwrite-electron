import type { EditorView } from '@codemirror/view'
import type { JSX } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import type { EditorCursor } from '../../state/status-store'
import { articleEditorExtensions } from '../extensions'
import { draftwriteTheme } from '../theme'
import { cursorOrigin } from './cursor-origin'

type TextEditorProps = {
  value: string
  onChange: (value: string) => void
  onCursorChange: (cursor: EditorCursor) => void
  onCreate: (view: EditorView) => void
}

export function TextEditor({
  value,
  onChange,
  onCursorChange,
  onCreate
}: TextEditorProps): JSX.Element {
  return (
    <CodeMirror
      value={value}
      height="100%"
      className="h-full"
      theme={draftwriteTheme}
      extensions={articleEditorExtensions}
      onCreateEditor={(view) => onCreate(view)}
      onChange={(next) => onChange(next)}
      onUpdate={(update) => {
        // Focus, scroll and geometry updates have no origin: only document and
        // selection changes publish the caret the status bar shows.
        const origin = cursorOrigin(update)
        if (origin === null) return

        const head = update.state.selection.main.head
        const line = update.state.doc.lineAt(head)
        onCursorChange({ line: line.number, column: head - line.from + 1, origin })
      }}
    />
  )
}
