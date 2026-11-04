import type { JSX } from 'react'
import { ArrowLeft, History, Columns2, GitCompareArrows, GitMerge } from 'lucide-react'
import type {
  EditorialWorkspace,
  EditorialVariant,
  EditorialAction
} from '../../../../shared/editorial'
import type { EditorialFormKind } from './EditorialForm'

export type EditorialMode = 'write' | 'parallel' | 'compare' | 'integrate'
export function EditorialToolbar({
  workspace,
  variant,
  saving,
  history,
  showArchived,
  mode,
  onClose,
  onSelect,
  onHistory,
  onMode,
  onForm,
  onAction,
  onShowArchived
}: {
  workspace: EditorialWorkspace
  variant: EditorialVariant
  saving: boolean
  history: boolean
  showArchived: boolean
  mode: EditorialMode
  onClose: () => void
  onSelect: (id: string) => void
  onHistory: () => void
  onMode: (mode: EditorialMode) => void
  onForm: (form: { type: EditorialFormKind; versionId?: string; variantId?: string }) => void
  onAction: (action: EditorialAction) => void
  onShowArchived: (show: boolean) => void
}): JSX.Element {
  return (
    <>
      <div className="editorial-workspace-toolbar">
        <button type="button" onClick={onClose} disabled={saving}>
          <ArrowLeft size={15} />
          Back to writing
        </button>
        <label>
          Variant
          <select value={variant.id} onChange={(e) => onSelect(e.target.value)}>
            {workspace.variants
              .filter((v) => showArchived || !v.archived || v.id === variant.id)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {workspace.primaryId === v.id ? ' · Primary' : ''}
                  {v.archived ? ' · Archived' : ''}
                </option>
              ))}
          </select>
        </label>
        <span>Last {variant.number}</span>
        <button
          type="button"
          disabled={variant.archived || saving}
          onClick={() => onForm({ type: 'version' })}
        >
          Save version
        </button>
        <button type="button" onClick={onHistory} aria-expanded={history}>
          <History size={15} />
          History
        </button>
        <button
          type="button"
          disabled={workspace.variants.filter((v) => !v.archived).length < 2}
          onClick={() => onMode('parallel')}
        >
          <Columns2 size={15} />
          Parallel
        </button>
        <button type="button" onClick={() => onMode('compare')}>
          <GitCompareArrows size={15} />
          Compare
        </button>
        <button type="button" disabled={variant.archived} onClick={() => onMode('integrate')}>
          <GitMerge size={15} />
          Integrate
        </button>
        {mode !== 'write' ? (
          <button type="button" onClick={() => onMode('write')}>
            Write
          </button>
        ) : null}
      </div>
      <div className="editorial-secondary-toolbar">
        <button
          type="button"
          disabled={variant.archived}
          onClick={() => onForm({ type: 'branch' })}
        >
          New variant
        </button>
        <button
          type="button"
          disabled={variant.archived || workspace.primaryId === variant.id}
          onClick={() => onAction({ type: 'primary', variantId: variant.id })}
        >
          Make primary
        </button>
        <button
          type="button"
          disabled={workspace.primaryId === variant.id && !variant.archived}
          onClick={() =>
            onAction({ type: 'archive', variantId: variant.id, archived: !variant.archived })
          }
        >
          {variant.archived ? 'Reactivate variant' : 'Archive variant'}
        </button>
        <button
          type="button"
          disabled={variant.archived}
          onClick={() => onForm({ type: 'convert' })}
        >
          Make independent
        </button>
        <button
          type="button"
          disabled={!workspace.versions.length}
          onClick={() => onForm({ type: 'publish' })}
        >
          Record publication
        </button>
        <label>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => onShowArchived(e.target.checked)}
          />
          Show archived
        </label>
        <small role="status">{saving ? 'Saving…' : 'Drafts saved automatically'}</small>
      </div>
    </>
  )
}
