import type { JSX } from 'react'
import { cn } from '../../lib/cn'
import { useWorkspace, useWorkspaceDispatch, type ViewMode } from '../../state/workspace-context'

const MODES: Array<{ mode: ViewMode; label: string }> = [
  { mode: 'edit', label: 'Edit' },
  { mode: 'split', label: 'Split' },
  { mode: 'preview', label: 'Preview' }
]

export function ViewModeSwitcher(): JSX.Element {
  const { viewMode } = useWorkspace()
  const dispatch = useWorkspaceDispatch()

  return (
    <div
      role="group"
      aria-label="View mode"
      className="flex shrink-0 items-center rounded bg-base-300 p-0.5"
    >
      {MODES.map(({ mode, label }) => {
        const active = viewMode === mode

        return (
          <button
            key={mode}
            type="button"
            aria-pressed={active}
            onClick={() => dispatch({ type: 'viewMode/select', viewMode: mode })}
            className={cn(
              'rounded px-2 py-0.5 text-xs transition',
              active
                ? 'bg-neutral font-medium text-base-content'
                : 'text-base-content/60 hover:text-base-content'
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
