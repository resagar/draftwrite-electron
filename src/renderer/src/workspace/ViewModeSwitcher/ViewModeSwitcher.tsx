import { Columns2, Eye, PenLine, type LucideIcon } from 'lucide-react'
import type { JSX } from 'react'
import { cn } from '../../lib/cn'
import { useWorkspace, useWorkspaceDispatch, type ViewMode } from '../../state/workspace-context'

const MODES: Array<{ mode: ViewMode; label: string; icon: LucideIcon }> = [
  { mode: 'edit', label: 'Edit', icon: PenLine },
  { mode: 'split', label: 'Split', icon: Columns2 },
  { mode: 'preview', label: 'Preview', icon: Eye }
]

export function ViewModeSwitcher(): JSX.Element {
  const { viewMode } = useWorkspace()
  const dispatch = useWorkspaceDispatch()

  return (
    <div
      role="group"
      aria-label="View mode"
      className="flex shrink-0 items-center gap-0.5 rounded-lg border border-line bg-base-200 p-0.5"
    >
      {MODES.map(({ mode, label, icon: Icon }) => {
        const active = viewMode === mode

        return (
          <button
            key={mode}
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={active}
            onClick={() => dispatch({ type: 'viewMode/select', viewMode: mode })}
            className={cn(
              'flex h-7 w-8 items-center justify-center rounded-md transition',
              active
                ? 'bg-neutral text-base-content'
                : 'text-base-content/60 hover:bg-neutral/40 hover:text-base-content'
            )}
          >
            <Icon aria-hidden="true" className="h-4.5 w-4.5" />
          </button>
        )
      })}
    </div>
  )
}
