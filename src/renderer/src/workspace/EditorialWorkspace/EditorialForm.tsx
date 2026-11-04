import { useState, type FormEvent, type JSX } from 'react'
import type {
  EditorialAction,
  EditorialReply,
  EditorialWorkspace,
  EditorialVariant,
  Increment
} from '../../../../shared/editorial'
import { nextEditorialNumber, hasEditorialChanges } from '../../../../shared/editorial'
import { FloatingPanel } from './FloatingPanel'

export type EditorialFormKind = 'version' | 'branch' | 'convert' | 'publish'
export function EditorialForm({
  type,
  workspace,
  variant,
  versionId,
  execute,
  onClose
}: {
  type: EditorialFormKind
  workspace: EditorialWorkspace
  variant: EditorialVariant
  versionId?: string
  execute: (action: EditorialAction) => Promise<EditorialReply>
  onClose: () => void
}): JSX.Element {
  const [increment, setIncrement] = useState<Increment>('patch')
  const [description, setDescription] = useState('')
  const [name, setName] = useState('')
  const [title, setTitle] = useState(
    variant.content.kind === 'article' ? variant.content.title : variant.content.topic
  )
  const [baseId, setBaseId] = useState(versionId ?? variant.headId ?? 'draft')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const label = {
    version: 'Save editorial version',
    branch: 'Create variant',
    convert: 'Create independent piece',
    publish: 'Record publication'
  }[type]
  const version = workspace.versions.find((v) => v.id === baseId)
  const pendingNotes = type === 'publish' && !!version?.notes.some((note) => !note.resolved)
  const needsVersion = baseId === 'draft' && hasEditorialChanges(workspace, variant)
  const versionFields = (
    <>
      <label>
        Change impact
        <select value={increment} onChange={(e) => setIncrement(e.target.value as Increment)}>
          <option value="major">Major — focus or structure</option>
          <option value="minor">Minor — paragraph development</option>
          <option value="patch">Patch — wording or corrections</option>
        </select>
      </label>
      <p>
        Next version: <strong>{nextEditorialNumber(variant.number, increment)}</strong>
      </p>
      <label>
        Change description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={4000}
          rows={3}
        />
      </label>
    </>
  )
  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (type === 'version')
        await execute({ type: 'version', variantId: variant.id, increment, description })
      if (type === 'branch') {
        let sourceId = baseId
        if (baseId === 'draft') {
          const latest = await execute({ type: 'read' })
          const current = latest.workspace.variants.find((v) => v.id === variant.id)!
          if (hasEditorialChanges(latest.workspace, current)) {
            const saved = await execute({
              type: 'version',
              variantId: variant.id,
              increment,
              description
            })
            sourceId = saved.workspace.variants.find((v) => v.id === variant.id)!.headId!
          } else if (current.headId) sourceId = current.headId
          else throw new Error('Make an editorial change before creating the first saved version.')
        }
        await execute({ type: 'branch', variantId: variant.id, versionId: sourceId, name })
      }
      if (type === 'convert') await execute({ type: 'convert', variantId: variant.id, title })
      if (type === 'publish')
        await execute({
          type: 'publish',
          variantId: variant.id,
          versionId: baseId,
          date,
          url: url.trim() || null
        })
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to complete operation')
    } finally {
      setBusy(false)
    }
  }
  return (
    <FloatingPanel
      label={label}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <form onSubmit={(event) => void submit(event)}>
        {type === 'version' ? versionFields : null}
        {type === 'branch' ? (
          <>
            <label>
              Variant name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
              />
            </label>
            <label>
              Start from
              <select value={baseId} onChange={(e) => setBaseId(e.target.value)}>
                <option value="draft">Current draft — save a version first</option>
                {workspace.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {workspace.variants.find((item) => item.id === v.variantId)?.name ??
                      v.variantName ??
                      'Origin'}{' '}
                    · {v.number} · {v.description}
                  </option>
                ))}
              </select>
            </label>
            {needsVersion ? versionFields : null}
          </>
        ) : null}
        {type === 'convert' ? (
          <>
            <label>
              {workspace.kind === 'article'
                ? 'Independent article title'
                : 'Independent post topic'}
              <input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <p>Preserve this variant’s history and notes, and archive it in the original piece.</p>
            {variant.id === workspace.primaryId ? (
              <p role="alert">Choose another primary variant before converting this one.</p>
            ) : null}
          </>
        ) : null}
        {type === 'publish' ? (
          <>
            <label>
              Published version
              <select
                value={baseId}
                onChange={(e) => {
                  setBaseId(e.target.value)
                  setAcknowledged(false)
                }}
                required
              >
                <option value="draft" disabled>
                  Choose a saved version
                </option>
                {workspace.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {workspace.variants.find((item) => item.id === v.variantId)?.name ??
                      v.variantName ??
                      'Origin'}{' '}
                    · {v.number} · {v.description}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Publication date
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label>
              Link (optional)
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} />
            </label>
            {pendingNotes ? (
              <>
                <p>This version has unresolved review notes.</p>
                <label>
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                  />
                  Record publication anyway
                </label>
              </>
            ) : null}
          </>
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
        <div className="editorial-form-actions">
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              busy ||
              (pendingNotes && !acknowledged) ||
              (type === 'convert' && variant.id === workspace.primaryId)
            }
          >
            {busy ? 'Saving…' : label}
          </button>
        </div>
      </form>
    </FloatingPanel>
  )
}
