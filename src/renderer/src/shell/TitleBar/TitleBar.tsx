import { Expand, Feather, PanelLeft, Shrink, Settings } from 'lucide-react'
import type { JSX } from 'react'
import { usePlatformModifier } from '../../state/use-platform'
import { useWorkspace, useWorkspaceDispatch } from '../../state/workspace-context'
import { IconButton } from '../../ui/IconButton/IconButton'

export function TitleBar({
  onSettings,
  settingsReady = true
}: {
  onSettings?: () => void
  settingsReady?: boolean
}): JSX.Element {
  const { sidebarCollapsed, zenMode } = useWorkspace()
  const modifier = usePlatformModifier()
  const dispatch = useWorkspaceDispatch()
  const zenLabel = `Zen mode (${modifier} Shift D)`

  return (
    <header className="z-30 flex h-9 min-h-9 items-center gap-3 border-b border-base-300 bg-base-300 px-3 select-none">
      <div className="flex w-[220px] min-w-0 items-center gap-1.5">
        <Feather aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate text-xs font-semibold tracking-wide">DraftWrite</span>
      </div>

      <div className="flex min-w-0 flex-1 justify-center">
        <input
          type="search"
          disabled
          aria-label="Search stories and articles (not available yet)"
          placeholder="Search stories and articles..."
          className="h-6 w-full max-w-[460px] rounded border border-line bg-base-200 px-2.5 text-xs text-base-content transition placeholder:text-base-content/60 focus-visible:border-primary disabled:cursor-not-allowed"
        />
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
