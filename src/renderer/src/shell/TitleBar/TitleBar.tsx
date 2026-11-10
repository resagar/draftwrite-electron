import { Expand, Feather, GitBranch, PanelLeft, Settings, Shrink, Trash2 } from 'lucide-react'
import type { JSX } from 'react'
import { useEditorActions, type EditorActionSet } from '../../state/editor-actions-context'
import { usePlatformModifier } from '../../state/use-platform'
import {
  useWorkspace,
  useWorkspaceDispatch,
  type DeleteRequest
} from '../../state/workspace-context'
import { IconButton } from '../../ui/IconButton/IconButton'
import { ViewModeSwitcher } from '../../workspace/ViewModeSwitcher/ViewModeSwitcher'

const DELETE_LABELS: Record<DeleteRequest['kind'], string> = {
  'delete-story': 'Delete story',
  'delete-article': 'Delete article',
  'delete-post': 'Delete post'
}

function EditorControls({ actions }: { actions: EditorActionSet }): JSX.Element {
  const dispatch = useWorkspaceDispatch()
  const { deleteRequest, versions } = actions

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <ViewModeSwitcher />
      {versions === null ? null : (
        <IconButton
          label="Versions and review"
          className="text-primary hover:text-primary"
          disabled={versions.disabled}
          onClick={versions.open}
        >
          <GitBranch aria-hidden="true" className="h-3.5 w-3.5" />
        </IconButton>
      )}
      {deleteRequest === null ? null : (
        <IconButton
          label={DELETE_LABELS[deleteRequest.kind]}
          tone="danger"
          onClick={() => dispatch({ type: 'dialog/open', request: deleteRequest })}
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
        </IconButton>
      )}
    </div>
  )
}

export function TitleBar({
  onSettings,
  settingsReady = true
}: {
  onSettings?: () => void
  settingsReady?: boolean
}): JSX.Element {
  const actions = useEditorActions()
  const { sidebarCollapsed, zenMode } = useWorkspace()
  const modifier = usePlatformModifier()
  const dispatch = useWorkspaceDispatch()
  const zenLabel = `Zen mode (${modifier} Shift D)`
  const platform = window.electron?.process.platform
  const integrated = platform === 'win32' || platform === 'linux'

  return (
    <header
      aria-label="Title bar"
      className={`z-30 flex h-9 min-h-9 items-center gap-3 border-b border-base-300 bg-base-300 px-3 select-none${integrated ? ' title-bar--integrated' : ''}`}
    >
      <div className="flex w-[220px] min-w-0 items-center gap-1.5">
        <Feather aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate text-xs font-semibold tracking-wide">DraftWrite</span>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center">
        {actions === null ? null : <EditorControls actions={actions} />}
      </div>

      <div className="flex w-[220px] items-center justify-end gap-2">
        <IconButton label="Settings" disabled={!settingsReady} onClick={onSettings}>
          <Settings aria-hidden="true" className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton
          label={zenLabel}
          aria-pressed={zenMode}
          onClick={() => dispatch({ type: 'zen/toggle' })}
        >
          {zenMode ? (
            <Shrink aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <Expand aria-hidden="true" className="h-3.5 w-3.5" />
          )}
        </IconButton>
        <IconButton
          label="Toggle sidebar"
          aria-pressed={sidebarCollapsed}
          onClick={() => dispatch({ type: 'sidebar/toggle' })}
        >
          <PanelLeft aria-hidden="true" className="h-3.5 w-3.5" />
        </IconButton>
        <span
          aria-hidden="true"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-secondary/40 bg-secondary/20 text-2xs font-medium text-secondary"
        >
          DW
        </span>
      </div>
    </header>
  )
}
