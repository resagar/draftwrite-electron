import { useEffect, useRef, useState, type JSX } from 'react'
import { EditorialToolbar, type EditorialMode } from './EditorialToolbar'
import type {
  EditorialAction,
  EditorialReply,
  EditorialWorkspace as Workspace,
  PieceKind
} from '../../../../shared/editorial'
import { useEditorial } from './use-editorial'
import { EditorialPane } from './EditorialPane'
import { EditorialComparison } from './EditorialComparison'
import { EditorialIntegration } from './EditorialIntegration'
import { EditorialHistory } from './EditorialHistory'
import { EditorialForm, type EditorialFormKind } from './EditorialForm'
import { StaleDraftRecovery } from './StaleDraftRecovery'
import { useWorkspaceNavigation } from '../../state/use-navigation'
import { registerSave } from '../../state/save-registry'
import { publishUnsavedDraft } from '../../state/status-store'

export function EditorialWorkspace({
  kind,
  pieceId,
  onClose,
  onLibraryChange
}: {
  kind: PieceKind
  pieceId: string
  onClose: (workspace: Workspace) => void
  onLibraryChange: () => void
}): JSX.Element {
  const editor = useEditorial(kind, pieceId)
  const navigate = useWorkspaceNavigation()
  const [selected, setSelected] = useState('')
  const [second, setSecond] = useState('')
  const [mode, setMode] = useState<EditorialMode>('write')
  const [history, setHistory] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [form, setForm] = useState<{
    type: EditorialFormKind
    versionId?: string
    variantId?: string
  } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [recoverStale, setRecoverStale] = useState(false)
  const [dirtyNotes, setDirtyNotes] = useState<Record<string, boolean>>({})
  const hasDirtyNotes = Object.values(dirtyNotes).some(Boolean)
  useEffect(() => {
    publishUnsavedDraft(editor.dirty || hasDirtyNotes)
  }, [editor.dirty, hasDirtyNotes])
  const canLeaveNotes = (): boolean => {
    if (!hasDirtyNotes) return true
    setNotice('Save or cancel the unfinished review note before changing this view.')
    return false
  }
  const showForm = (next: {
    type: EditorialFormKind
    versionId?: string
    variantId?: string
  }): void => {
    if (canLeaveNotes())
      void editor
        .flush()
        .then(() => setForm(next))
        .catch(() => {})
  }
  const latestFlush = useRef(editor.flush)
  useEffect(() => {
    latestFlush.current = editor.flush
  })
  useEffect(() => {
    registerSave(() => latestFlush.current())
    return () => {
      registerSave(null)
      publishUnsavedDraft(false)
    }
  }, [])
  const workspace = editor.workspace
  const activeId = selected || workspace?.primaryId || ''
  const variant = workspace?.variants.find((v) => v.id === activeId)
  const secondVariant =
    workspace?.variants.find((v) => v.id === second) ??
    workspace?.variants.find((v) => v.id !== activeId && !v.archived)
  const execute = async (action: EditorialAction): Promise<EditorialReply> => {
    const result = await editor.execute(action)
    if (action.type === 'convert' || action.type === 'primary') onLibraryChange()
    return result
  }
  const act = (action: EditorialAction): void => {
    if (!canLeaveNotes()) return
    setNotice(null)
    void execute(action).catch((caught) =>
      setNotice(caught instanceof Error ? caught.message : 'Operation failed')
    )
  }
  const changeMode = async (next: EditorialMode): Promise<void> => {
    if (!canLeaveNotes()) return
    try {
      await editor.flush()
      setMode(next)
      setNotice(null)
    } catch {
      /* the hook keeps the draft and reports the failure */
    }
  }
  const close = async (): Promise<void> => {
    if (!canLeaveNotes()) return
    try {
      await editor.flush()
      const result = await editor.execute({ type: 'read' })
      publishUnsavedDraft(false)
      onClose(result.workspace)
    } catch {
      /* retain the workspace for retry */
    }
  }
  if (!workspace || !variant)
    return (
      <section className="editorial-workspace" aria-label="Editorial workspace">
        <p>{editor.error ?? 'Loading editorial workspace…'}</p>
        <button type="button" onClick={() => void editor.execute({ type: 'read' }).catch(() => {})}>
          Retry
        </button>
      </section>
    )
  const pane = (id: string): JSX.Element => {
    const item = workspace.variants.find((v) => v.id === id)!
    return (
      <EditorialPane
        key={id}
        variant={item}
        content={editor.drafts[id] ?? item.content}
        disabled={item.archived}
        status={
          editor.error && editor.failedDraftId === id
            ? 'error'
            : editor.saving
              ? 'saving'
              : editor.drafts[id]
                ? 'pending'
                : 'saved'
        }
        onSaveVersion={() => showForm({ type: 'version', variantId: id })}
        onDirtyNote={(dirty) => {
          setDirtyNotes((previous) =>
            previous[id] === dirty ? previous : { ...previous, [id]: dirty }
          )
        }}
        onChange={(content) => editor.edit(id, content)}
        onNote={async (noteId, text, anchor) => {
          await execute({ type: 'note', variantId: id, noteId, text, anchor })
        }}
        onResolve={async (noteId, resolved) => {
          await execute({ type: 'resolveNote', variantId: id, noteId, resolved })
        }}
      />
    )
  }
  return (
    <section className="editorial-workspace" aria-label="Editorial workspace">
      <EditorialToolbar
        workspace={workspace}
        variant={variant}
        saving={editor.saving}
        history={history}
        showArchived={showArchived}
        mode={mode}
        onClose={() => void close()}
        onSelect={(id) => {
          if (canLeaveNotes()) {
            setSelected(id)
            setMode('write')
          }
        }}
        onHistory={() => setHistory(!history)}
        onMode={(next) => void changeMode(next)}
        onForm={showForm}
        onAction={act}
        onShowArchived={setShowArchived}
      />
      {editor.error || notice || editor.stale ? (
        <div role="alert" className="editorial-error">
          <p>{notice ?? editor.error ?? 'Newer stored drafts need review.'}</p>
          {editor.failedDraftId ? (
            <p>
              Variant:{' '}
              {workspace.variants.find((item) => item.id === editor.failedDraftId)?.name ??
                'Unavailable variant'}
            </p>
          ) : null}
          <button type="button" onClick={() => void editor.flush().catch(() => {})}>
            Retry saving
          </button>
          {editor.stale ? (
            <button
              type="button"
              onClick={() => {
                void editor
                  .execute({ type: 'read' })
                  .then(() => setRecoverStale(true))
                  .catch(() => {})
              }}
            >
              Review newer stored drafts
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="editorial-workspace-body">
        {history ? (
          <EditorialHistory
            workspace={workspace}
            canRecover={!variant.archived}
            onRecover={(versionId) => act({ type: 'restore', variantId: activeId, versionId })}
            onBranch={(versionId) => showForm({ type: 'branch', versionId })}
            onOpenPiece={(id) =>
              navigate(
                kind === 'article'
                  ? { type: 'article/select', articleId: id }
                  : { type: 'post/select', postId: id }
              )
            }
          />
        ) : null}
        <div className="editorial-main">
          {mode === 'write' ? pane(activeId) : null}
          {mode === 'parallel' && secondVariant ? (
            <>
              <label className="editorial-parallel-selector">
                Second variant
                <select
                  value={secondVariant.id}
                  onChange={(e) => {
                    if (canLeaveNotes()) setSecond(e.target.value)
                  }}
                >
                  {workspace.variants
                    .filter((v) => v.id !== activeId && !v.archived)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                </select>
              </label>
              <div className="editorial-parallel">
                {pane(activeId)}
                {pane(secondVariant.id)}
              </div>
            </>
          ) : null}
          {mode === 'compare' ? (
            <EditorialComparison workspace={workspace} variantId={activeId} />
          ) : null}
          {mode === 'integrate' ? (
            <EditorialIntegration
              key={activeId}
              workspace={workspace}
              variantId={activeId}
              execute={execute}
            />
          ) : null}
        </div>
      </div>
      {form ? (
        <EditorialForm
          key={form.type + (form.versionId ?? '')}
          type={form.type}
          workspace={workspace}
          variant={workspace.variants.find((v) => v.id === (form.variantId ?? activeId))!}
          versionId={form.versionId}
          execute={execute}
          onClose={() => setForm(null)}
        />
      ) : null}
      {recoverStale ? (
        <StaleDraftRecovery
          workspace={workspace}
          drafts={editor.drafts}
          onResolve={editor.resolveStale}
          onClose={() => setRecoverStale(false)}
        />
      ) : null}
    </section>
  )
}
