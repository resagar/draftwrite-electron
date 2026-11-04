import { useState, type JSX } from 'react'
import type { EditorialWorkspace, Writing, Increment } from '../../../../shared/editorial'
import { FloatingPanel } from './FloatingPanel'

export function StaleDraftRecovery({
  workspace,
  drafts,
  onResolve,
  onClose
}: {
  workspace: EditorialWorkspace
  drafts: Record<string, Writing>
  onResolve: (keepLocal: boolean, increment: Increment, description: string) => Promise<void>
  onClose: () => void
}): JSX.Element {
  const [increment, setIncrement] = useState<Increment>('minor')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const resolve = async (keepLocal: boolean): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      await onResolve(keepLocal, increment, description)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to recover draft')
    } finally {
      setBusy(false)
    }
  }
  const describe = (content: Writing): JSX.Element => (
    <div>
      {content.kind === 'article' ? (
        <>
          <h3>{content.title}</h3>
          <p>{content.subtitle}</p>
          <p>{content.target}</p>
        </>
      ) : (
        <h3>{content.topic}</h3>
      )}
      <pre>{content.text}</pre>
    </div>
  )
  return (
    <FloatingPanel
      label="Resolve newer stored drafts"
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <p>
        Your pending drafts are retained. Review the newer stored writing before choosing which
        drafts to continue.
      </p>
      {Object.entries(drafts).map(([id, local]) => {
        const stored = workspace.variants.find((v) => v.id === id)
        return (
          <details key={id} open>
            <summary>{stored?.name ?? 'Unavailable variant'}</summary>
            <strong>Stored writing</strong>
            <div className="editorial-recovery-text">
              {stored ? describe(stored.content) : 'This variant is no longer available.'}
            </div>
            <strong>My pending writing</strong>
            <div className="editorial-recovery-text">{describe(local)}</div>
          </details>
        )
      })}
      <label>
        Preservation increment
        <select value={increment} onChange={(e) => setIncrement(e.target.value as Increment)}>
          <option value="major">Major</option>
          <option value="minor">Minor</option>
          <option value="patch">Patch</option>
        </select>
      </label>
      <label>
        Preservation description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </label>
      <p>
        Applying your drafts first saves a manual version of any unversioned stored work, using the
        increment above.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <div className="editorial-form-actions">
        <button type="button" disabled={busy} onClick={() => void resolve(false)}>
          Discard my pending drafts and use stored
        </button>
        <button
          type="button"
          disabled={busy || !description.trim()}
          onClick={() => void resolve(true)}
        >
          Preserve stored work and apply my drafts
        </button>
      </div>
    </FloatingPanel>
  )
}
