import type { EditorView } from '@codemirror/view'
import type { JSX } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { articleEditorExtensions } from '../extensions'
import { draftwriteTheme } from '../theme'

export type EditorCursor = {
  line: number
  column: number
}

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
        const head = update.state.selection.main.head
        const line = update.state.doc.lineAt(head)
        onCursorChange({ line: line.number, column: head - line.from + 1 })
      }}
    />
  )
}
