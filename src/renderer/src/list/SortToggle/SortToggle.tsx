import { ArrowDownWideNarrow } from 'lucide-react'
import type { JSX } from 'react'
import { cn } from '../../lib/cn'
import { useWorkspace, useWorkspaceDispatch } from '../../state/workspace-context'

export function SortToggle(): JSX.Element {
  const { sortDirection } = useWorkspace()
  const dispatch = useWorkspaceDispatch()
  const newestFirst = sortDirection === 'desc'

  return (
    <button
      type="button"
      aria-label={`Sort by updated date, ${newestFirst ? 'newest first' : 'oldest first'}`}
      onClick={() => dispatch({ type: 'sort/toggle' })}
      className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs text-base-content/60 transition hover:bg-neutral/50 hover:text-base-content"
    >
      <span>{newestFirst ? 'Newest' : 'Oldest'}</span>
      <ArrowDownWideNarrow
        aria-hidden="true"
        className={cn('h-3 w-3 text-secondary', newestFirst ? '' : 'rotate-180')}
      />
    </button>
  )
}
