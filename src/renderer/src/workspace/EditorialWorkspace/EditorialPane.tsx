import { useState, type JSX } from 'react'
import type { EditorView } from '@codemirror/view'
import type { EditorialVariant, Writing } from '../../../../shared/editorial'
import { TextEditor } from '../../editor/TextEditor/TextEditor'
import { ReviewNotes } from './ReviewNotes'
import { useEditorStatus } from '../../state/use-editor-status'
import type { SaveStatus } from '../../state/status-store'

type NoteRange = { from: number; to: number } | null
export function EditorialPane({
  variant,
  content,
  disabled,
  status,
  onChange,
  onNote,
  onResolve,
  onDirtyNote,
  onSaveVersion
}: {
  variant: EditorialVariant
  content: Writing
  disabled: boolean
  status: SaveStatus
  onChange: (content: Writing) => void
  onNote: (id: string | null, text: string, range: NoteRange) => Promise<void>
  onResolve: (id: string, resolved: boolean) => Promise<void>
  onDirtyNote: (dirty: boolean) => void
  onSaveVersion: () => void
}): JSX.Element {
  const [view, setView] = useState<EditorView | null>(null)
  const { publishCursor } = useEditorStatus({ text: content.text, status })
  const update = (field: string, value: string): void => onChange({ ...content, [field]: value })
  return (
    <section className="editorial-pane" aria-label={`${variant.name} draft`}>
      <header>
        <strong>{variant.name}</strong>
        <span>Last version {variant.number}</span>
        <small role="status">
          {disabled
            ? 'Archived · read only'
            : status === 'saving'
              ? 'Saving…'
              : status === 'error'
                ? 'Draft save failed'
                : status === 'pending'
                  ? 'Pending autosave'
                  : 'Draft saved'}
        </small>
        <button type="button" disabled={disabled || status === 'saving'} onClick={onSaveVersion}>
          Save this variant
        </button>
      </header>
      <fieldset disabled={disabled} className="editorial-writing-fields">
        {content.kind === 'article' ? (
          <>
            <label>
              Title
              <input value={content.title} onChange={(e) => update('title', e.target.value)} />
            </label>
            <label>
              Subtitle
              <input
                value={content.subtitle}
                onChange={(e) => update('subtitle', e.target.value)}
              />
            </label>
            <label>
              Target
              <input value={content.target} onChange={(e) => update('target', e.target.value)} />
            </label>
          </>
        ) : (
          <label>
            Topic
            <input value={content.topic} onChange={(e) => update('topic', e.target.value)} />
          </label>
        )}
      </fieldset>
      <ReviewNotes
        notes={variant.notes}
        view={view}
        disabled={disabled}
        onSave={onNote}
        onResolve={onResolve}
        onDirty={onDirtyNote}
      />
      <div className="editorial-pane-editor">
        <TextEditor
          value={content.text}
          readOnly={disabled}
          onChange={(text) => update('text', text)}
          onCursorChange={publishCursor}
          onCreate={setView}
        />
      </div>
    </section>
  )
}
