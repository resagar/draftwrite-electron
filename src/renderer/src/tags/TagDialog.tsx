import { TagColorSelect } from './TagColorSelect'
import { useEffect, useRef, useState, type JSX } from 'react'
import { type TagColor, type TagImpact } from '../../../shared/tags'
import { useDataPort } from '../data/port-context'
import { Modal } from '../ui/Modal/Modal'
import { tagStyle } from './tag-style'

type Props = {
  name: string
  mode: 'settings' | 'delete'
  color: TagColor
  onSave: (color: TagColor) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}

export function TagDialog({ name, mode, color, onSave, onDelete, onClose }: Props): JSX.Element {
  const port = useDataPort()
  const [draft, setDraft] = useState(color)
  const [impact, setImpact] = useState<TagImpact | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (mode !== 'delete') return
    let active = true
    void port
      .tagImpact(name)
      .then((value) => {
        if (active) setImpact(value)
      })
      .catch(() => {
        if (active) setError('The deletion impact could not be loaded. Please retry.')
      })
    return () => {
      active = false
    }
  }, [mode, name, port, attempt])

  const submit = async (): Promise<void> => {
    if (submitting.current || (mode === 'delete' && !impact)) return
    submitting.current = true
    setBusy(true)
    setError(null)
    try {
      if (mode === 'settings') await onSave(draft)
      else await onDelete()
      onClose()
    } catch {
      setError(
        mode === 'settings'
          ? 'The color could not be saved. Please retry.'
          : 'The tag could not be deleted. No tags were removed. Please retry.'
      )
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }
  const close = (): void => {
    if (!submitting.current) onClose()
  }
  return (
    <Modal title={mode === 'settings' ? 'Tag Settings' : 'Delete tag everywhere'} onClose={close}>
      {mode === 'settings' ? (
        <form
          onKeyDown={(event) => {
            if (event.ctrlKey || event.metaKey) event.stopPropagation()
          }}
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
          className="space-y-4"
        >
          <label className="block text-xs">
            Name
            <input
              aria-label="Tag name"
              readOnly
              value={name}
              className="mt-1 w-full rounded border border-line bg-base-200 px-3 py-2"
            />
          </label>
          <div className="text-xs">
            Color
            <TagColorSelect value={draft} disabled={busy} onChange={setDraft} />
          </div>
          <span className="tag-chip inline-block max-w-full truncate" style={tagStyle(draft)}>
            {name}
          </span>
          {error ? (
            <p role="alert" className="text-xs text-error">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className="rounded border border-line px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-primary px-3 py-1.5 text-xs text-primary-content disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      ) : (
        <div
          className="space-y-3 text-xs"
          onKeyDown={(event) => {
            if (event.ctrlKey || event.metaKey) event.stopPropagation()
          }}
        >
          <p>Delete “{name}” from every story, article and post? This cannot be undone.</p>
          {impact ? (
            <p>
              {impact.stories} stories, {impact.articles} articles, {impact.posts} posts affected.
              Their content will be kept.
            </p>
          ) : (
            <p role="status">Loading affected items…</p>
          )}
          {error ? (
            <p role="alert" className="text-error">
              {error}
            </p>
          ) : null}
          {!impact && error ? (
            <button
              type="button"
              onClick={() => {
                setError(null)
                setAttempt((v) => v + 1)
              }}
            >
              Retry
            </button>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className="rounded border border-line px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !impact}
              onClick={() => void submit()}
              className="rounded border border-error/50 bg-error/10 px-3 py-1.5 text-error disabled:opacity-60"
            >
              {busy ? 'Deleting…' : 'Delete tag everywhere'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
