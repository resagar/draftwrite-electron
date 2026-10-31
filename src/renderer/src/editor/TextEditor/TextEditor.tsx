import type { EditorView } from '@codemirror/view'
import { useCallback, useLayoutEffect, useMemo, useState, type JSX } from 'react'
import { Compartment } from '@codemirror/state'
import { getCM } from '@replit/codemirror-vim'
import { publishStatus } from '../../state/status-store'
import { useTypography } from '../../settings/typography-context'
import CodeMirror from '@uiw/react-codemirror'
import type { EditorCursor } from '../../state/status-store'
import { articleEditorExtensions } from '../extensions'
import { vimEditing } from '../vim'
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
  const { preferences } = useTypography()
  const enabled = preferences.editor.vimMode === true
  const [view, setView] = useState<EditorView | null>(null)
  const compartment = useMemo(() => new Compartment(), [])
  const extensions = useMemo(() => [compartment.of([]), ...articleEditorExtensions], [compartment])
  const create = useCallback(
    (next: EditorView) => {
      setView(next)
      onCreate(next)
    },
    [onCreate]
  )

  useLayoutEffect(() => {
    if (!view) return
    const selection = view.state.selection
    const { scrollTop, scrollLeft } = view.scrollDOM
    view.dispatch({ effects: compartment.reconfigure(enabled ? vimEditing : []) })
    // Entering or leaving modal editing must not reinterpret the current selection.
    if (!view.state.selection.eq(selection)) view.dispatch({ selection })
    view.scrollDOM.scrollTo?.({ top: scrollTop, left: scrollLeft, behavior: 'instant' })
    const cm = enabled ? getCM(view) : null
    const reportMode = (): void => {
      const state = cm?.state.vim
      publishStatus({
        vimMode: !state
          ? null
          : state.visualMode
            ? 'Visual'
            : state.insertMode
              ? 'Insert'
              : 'Normal'
      })
    }
    cm?.on('vim-mode-change', reportMode)
    reportMode()
    return () => {
      cm?.off('vim-mode-change', reportMode)
      publishStatus({ vimMode: null })
    }
  }, [view, enabled, compartment])

  return (
    <CodeMirror
      value={value}
      height="100%"
      className="h-full"
      theme={draftwriteTheme}
      extensions={extensions}
      onCreateEditor={create}
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
