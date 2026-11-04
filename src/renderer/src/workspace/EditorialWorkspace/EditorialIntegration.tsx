import { noteRelatesToChange } from '../../../../shared/editorial'
import { useState, type JSX } from 'react'
import type {
  EditorialAction,
  EditorialReply,
  EditorialWorkspace,
  IntegrationPlan
} from '../../../../shared/editorial'

export function EditorialIntegration({
  workspace,
  variantId,
  execute
}: {
  workspace: EditorialWorkspace
  variantId: string
  execute: (action: EditorialAction) => Promise<EditorialReply>
}): JSX.Element {
  const versions = workspace.versions.filter((v) => v.variantId !== variantId)
  const [sourceId, setSourceId] = useState(versions.at(-1)?.id ?? '')
  const [plan, setPlan] = useState<IntegrationPlan | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [noteIds, setNoteIds] = useState<string[]>([])
  const [resolutions, setResolutions] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (apply: boolean): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      if (apply) {
        await execute({ type: 'integrate', variantId, sourceId, selected, resolutions, noteIds })
        setPlan(null)
        setSelected([])
        setNoteIds([])
        setResolutions({})
      } else {
        const result = await execute({ type: 'plan', variantId, sourceId })
        setPlan(result.plan!)
        setSelected([])
        setNoteIds([])
        setResolutions({})
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Integration failed')
    } finally {
      setBusy(false)
    }
  }
  const relatedNotes =
    plan?.notes.filter((note) =>
      plan.chunks.some((chunk) => selected.includes(chunk.id) && noteRelatesToChange(note, chunk))
    ) ?? []
  return (
    <section className="editorial-integration" aria-label="Integrate editorial changes">
      <label>
        Source version
        <select
          value={sourceId}
          onChange={(e) => {
            setSourceId(e.target.value)
            setPlan(null)
          }}
        >
          <option value="">Choose a saved version</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {workspace.variants.find((item) => item.id === v.variantId)?.name ??
                v.variantName ??
                'Origin'}{' '}
              · {v.number} · {v.description}
            </option>
          ))}
        </select>
      </label>
      <button type="button" disabled={!sourceId || busy} onClick={() => void run(false)}>
        Review changes
      </button>
      <p>Save a version of pending destination changes before applying an integration.</p>
      {error ? <p role="alert">{error}</p> : null}
      {plan && !plan.chunks.length ? <p>No new changes to integrate.</p> : null}
      {plan?.chunks.map((chunk) => (
        <section key={chunk.id} className="editorial-integration-chunk">
          <label>
            <input
              type="checkbox"
              checked={selected.includes(chunk.id)}
              onChange={(e) => {
                setSelected(
                  e.target.checked
                    ? [...selected, chunk.id]
                    : selected.filter((id) => id !== chunk.id)
                )
                setNoteIds([])
              }}
            />
            {chunk.field} · {chunk.conflict ? 'Conflict — choose the result' : 'Incoming change'}
          </label>
          <div className="editorial-conflict-columns">
            <div>
              <strong>Base</strong>
              <pre>{chunk.base || '(empty)'}</pre>
            </div>
            <div>
              <strong>Source</strong>
              <pre>{chunk.source || '(deleted)'}</pre>
            </div>
            <div>
              <strong>Destination</strong>
              <pre>{chunk.destination || '(empty)'}</pre>
            </div>
          </div>
          {chunk.conflict && selected.includes(chunk.id) ? (
            <>
              <label>
                Result
                <textarea
                  value={resolutions[chunk.id] ?? chunk.destination}
                  onChange={(e) => setResolutions({ ...resolutions, [chunk.id]: e.target.value })}
                />
              </label>
              <div className="editorial-form-actions">
                <button
                  type="button"
                  onClick={() => setResolutions({ ...resolutions, [chunk.id]: chunk.source })}
                >
                  Use source
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setResolutions({
                      ...resolutions,
                      [chunk.id]: resolutions[chunk.id] ?? chunk.destination
                    })
                  }
                >
                  Confirm result
                </button>
              </div>
            </>
          ) : null}
        </section>
      ))}
      {relatedNotes.length ? (
        <fieldset>
          <legend>Pending notes to carry over</legend>
          {relatedNotes.map((note) => (
            <label key={note.id}>
              <input
                type="checkbox"
                checked={noteIds.includes(note.id)}
                onChange={(e) =>
                  setNoteIds(
                    e.target.checked
                      ? [...noteIds, note.id]
                      : noteIds.filter((id) => id !== note.id)
                  )
                }
              />
              {note.text}
            </label>
          ))}
        </fieldset>
      ) : null}
      {plan ? (
        <div className="editorial-form-actions">
          <button type="button" disabled={busy} onClick={() => setPlan(null)}>
            Cancel integration
          </button>
          <button
            type="button"
            disabled={
              busy ||
              !selected.length ||
              plan.chunks.some(
                (chunk) =>
                  selected.includes(chunk.id) &&
                  chunk.conflict &&
                  !Object.prototype.hasOwnProperty.call(resolutions, chunk.id)
              )
            }
            onClick={() => void run(true)}
          >
            Apply selected changes
          </button>
        </div>
      ) : null}
    </section>
  )
}
