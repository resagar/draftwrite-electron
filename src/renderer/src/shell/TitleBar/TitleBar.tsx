import { Expand, Feather, PanelLeft, Search, Settings, Shrink } from 'lucide-react'
import type { JSX } from 'react'
import { usePlatformModifier } from '../../state/use-platform'
import { useWorkspace, useWorkspaceDispatch } from '../../state/workspace-context'
import { IconButton } from '../../ui/IconButton/IconButton'
import { Kbd } from '../../ui/Kbd/Kbd'

export function TitleBar({
  onSettings,
  onSearch,
  settingsReady = true
}: {
  onSettings?: () => void
  onSearch: () => void
  settingsReady?: boolean
}): JSX.Element {
  const { sidebarCollapsed, zenMode } = useWorkspace()
  const modifier = usePlatformModifier()
  const dispatch = useWorkspaceDispatch()
  const zenLabel = `Zen mode (${modifier} Shift D)`
  const searchLabel = `Search stories, articles and posts (${modifier} K)`

  return (
    <header className="z-30 flex h-9 min-h-9 items-center gap-3 border-b border-base-300 bg-base-300 px-3 select-none">
      <div className="flex w-[220px] min-w-0 items-center gap-1.5">
        <Feather aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate text-xs font-semibold tracking-wide">DraftWrite</span>
      </div>

      <div className="flex min-w-0 flex-1 justify-center">
        <button
          type="button"
          onClick={onSearch}
          aria-label={searchLabel}
          className="flex h-6 w-full max-w-[460px] items-center gap-1.5 rounded border border-line bg-base-200 px-2.5 text-xs text-base-content/60 transition hover:border-line-strong focus-visible:border-primary"
        >
          <Search aria-hidden="true" className="h-3 w-3 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">
            Search stories, articles and posts…
          </span>
          <Kbd className="shrink-0">{modifier} K</Kbd>
        </button>
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
