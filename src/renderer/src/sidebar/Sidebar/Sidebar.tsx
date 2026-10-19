import { PlusCircle } from 'lucide-react'
import type { JSX } from 'react'
import { cn } from '../../lib/cn'
import { usePlatformModifier } from '../../state/use-platform'
import { useWorkspaceNavigation } from '../../state/use-navigation'
import { useWorkspace } from '../../state/workspace-context'
import { Kbd } from '../../ui/Kbd/Kbd'
import { LibraryNav } from '../LibraryNav/LibraryNav'
import { TagList } from '../TagList/TagList'

export function Sidebar(): JSX.Element {
  const { sidebarCollapsed } = useWorkspace()
  const navigate = useWorkspaceNavigation()
  const modifier = usePlatformModifier()

  return (
    <aside
      aria-label="Library"
      className={cn(
        'flex w-14 min-w-14 shrink-0 flex-col justify-between border-r border-base-300 bg-base-200 select-none',
        sidebarCollapsed ? '' : 'lg:w-[220px] lg:min-w-[220px]'
      )}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <div>
          <h2
            className={cn(
              'px-2 pb-1.5 text-2xs font-semibold tracking-wider uppercase text-base-content/60',
              sidebarCollapsed ? 'hidden' : 'hidden lg:block'
            )}
          >
            Library
          </h2>
          <LibraryNav collapsed={sidebarCollapsed} />
        </div>

        <TagList collapsed={sidebarCollapsed} />
      </div>

      <div className="border-t border-base-300 p-3">
        <button
          type="button"
          aria-label={`New Story (${modifier} N)`}
          title={`New Story (${modifier} N)`}
          onClick={() => navigate({ type: 'create/start', kind: 'story' })}
          className="flex h-8 w-full items-center justify-center gap-2 rounded border border-line-strong bg-neutral text-xs font-medium text-base-content transition hover:bg-neutral/80"
        >
          <PlusCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span
            className={cn('items-center gap-2', sidebarCollapsed ? 'hidden' : 'hidden lg:flex')}
          >
            New Story
            <Kbd>{`${modifier} N`}</Kbd>
          </span>
        </button>
      </div>
    </aside>
  )
}
