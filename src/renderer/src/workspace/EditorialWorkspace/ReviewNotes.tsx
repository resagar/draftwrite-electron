import { useEffect, useRef, useState, type JSX } from 'react'
import { createPortal } from 'react-dom'
import type { EditorView } from '@codemirror/view'
import { MessageSquarePlus, MessageSquare } from 'lucide-react'
import type { ReviewNote } from '../../../../shared/editorial'
import { useNotePositions } from './use-note-positions'
import { FloatingPanel, type PanelAnchor } from './FloatingPanel'

type Range = { from: number; to: number; quote?: string }
export function ReviewNotes({
  notes,
  view,
  disabled,
  onSave,
  onResolve,
  onDirty
}: {
  notes: ReviewNote[]
  view: EditorView | null
  disabled: boolean
  onSave: (id: string | null, text: string, range: Range | null) => Promise<void>
  onResolve: (id: string, resolved: boolean) => Promise<void>
  onDirty?: (dirty: boolean) => void
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const [noteId, setNoteId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [range, setRange] = useState<Range | null>(null)
  const [originalRange, setOriginalRange] = useState('null')
  const dirty = text !== originalText || JSON.stringify(range) !== originalRange
  const [anchor, setAnchor] = useState<PanelAnchor | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showList, setShowList] = useState(false)
  const quotation = range?.quote ?? notes.find((note) => note.id === noteId)?.anchor?.quote
  useEffect(() => {
    onDirty?.(dirty)
  }, [dirty, onDirty])
  const latestDirty = useRef(onDirty)
  useEffect(() => {
    latestDirty.current = onDirty
  })
  useEffect(() => () => latestDirty.current?.(false), [])
  const resetRange = (next: Range | null): void => {
    setRange(next)
    setOriginalRange(JSON.stringify(next))
  }
  const openSelection = (): void => {
    if (dirty) {
      setOpen(true)
      return
    }
    const selected = view?.state.selection.main
    if (!selected || selected.empty) return
    const rect = view?.coordsAtPos(selected.to)
    setNoteId(null)
    setText('')
    setOriginalText('')
    resetRange({
      from: selected.from,
      to: selected.to,
      quote: view!.state.doc.sliceString(selected.from, selected.to)
    })
    setError(null)
    setAnchor(rect ? { left: rect.left, top: rect.top, bottom: rect.bottom } : undefined)
    setOpen(true)
  }
  const {
    markers,
    selection,
    anchor: measuredAnchor
  } = useNotePositions(view, notes, open ? range : null, openSelection)
  const read = (note: ReviewNote): void => {
    if (dirty) {
      if (noteId !== note.id) setError('Save or cancel the unfinished note before opening another.')
      setOpen(true)
      return
    }
    setNoteId(note.id)
    setText(note.text)
    setOriginalText(note.text)
    resetRange(
      note.anchor && !note.anchor.detached
        ? { from: note.anchor.from, to: note.anchor.to, quote: note.anchor.quote }
        : null
    )
    const rect =
      note.anchor && !note.anchor.detached && view
        ? view.coordsAtPos(Math.min(note.anchor.from, view.state.doc.length))
        : null
    setAnchor(rect ? { left: rect.left, top: rect.top, bottom: rect.bottom } : undefined)
    setError(null)
    setOpen(true)
  }
  const save = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      await onSave(noteId, text, range)
      setOpen(false)
      setText('')
      setOriginalText('')
      setNoteId(null)
      resetRange(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save note')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="editorial-note-actions">
        <button
          type="button"
          onClick={() => {
            setShowList(!showList)
          }}
        >
          Notes ({notes.filter((n) => !n.resolved).length})
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!dirty) {
              setNoteId(null)
              setText('')
              setOriginalText('')
              resetRange(null)
            }
            setAnchor(undefined)
            setOpen(true)
            setError(null)
          }}
        >
          Add general note
        </button>
        <button
          type="button"
          disabled={disabled || !view}
          onClick={openSelection}
          title="Select text, then annotate (Ctrl+Shift+M)"
        >
          <MessageSquarePlus size={14} /> Annotate selection
        </button>
      </div>
      {showList ? (
        <div className="editorial-notes-list" aria-label="Review notes">
          {!notes.length ? (
            <p>No review notes yet.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id}>
                <button type="button" onClick={() => read(note)}>
                  {note.text}
                </button>
                <small>
                  {note.resolved ? 'Resolved' : 'Pending'}
                  {note.anchor?.detached ? ' · Needs relocation' : ''}
                  {note.origin ? ' · Inherited' : ''}
                </small>
                <button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => {
                    setBusy(true)
                    void onResolve(note.id, !note.resolved)
                      .catch((caught) => setError(String(caught)))
                      .finally(() => setBusy(false))
                  }}
                >
                  {note.resolved ? 'Reopen note' : 'Resolve note'}
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}
      {error && !open ? <p role="alert">{error}</p> : null}
      {createPortal(
        <>
          {markers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              className="editorial-note-marker"
              aria-label="Open paragraph note"
              style={{ left: marker.left, top: marker.top }}
              onClick={() => {
                const note = notes.find((n) => n.id === marker.id)
                if (note) read(note)
              }}
            >
              <MessageSquare size={16} />
            </button>
          ))}
          {selection && !disabled && !open ? (
            <button
              type="button"
              className="editorial-selection-action"
              aria-label="Annotate selected text"
              style={{
                left: Math.min(selection.left, window.innerWidth - 48),
                top: Math.max(8, selection.top - 28)
              }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={openSelection}
            >
              <MessageSquarePlus size={16} />
            </button>
          ) : null}
        </>,
        document.body
      )}
      {open ? (
        <FloatingPanel
          label="Review note"
          anchor={measuredAnchor ?? anchor}
          onClose={() => setOpen(false)}
        >
          {quotation ? <blockquote>{quotation}</blockquote> : null}
          <label>
            Review observation
            <textarea
              aria-label="Review observation"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={5}
              readOnly={disabled}
            />
          </label>
          {noteId && view && !disabled ? (
            <button
              type="button"
              onClick={() => {
                const selected = view.state.selection.main
                if (!selected.empty)
                  setRange({
                    from: selected.from,
                    to: selected.to,
                    quote: view!.state.doc.sliceString(selected.from, selected.to)
                  })
              }}
            >
              Attach current selection
            </button>
          ) : null}
          {error ? <p role="alert">{error}</p> : null}
          <div className="editorial-form-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false)
                setText('')
                setOriginalText('')
                setNoteId(null)
                resetRange(null)
              }}
            >
              Cancel
            </button>
            {!disabled ? (
              <button type="button" disabled={busy || !text.trim()} onClick={() => void save()}>
                Save note
              </button>
            ) : null}
          </div>
        </FloatingPanel>
      ) : null}
    </>
  )
}
