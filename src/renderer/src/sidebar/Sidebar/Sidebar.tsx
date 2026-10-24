import { PlusCircle } from 'lucide-react'
import type { CSSProperties, JSX } from 'react'
import { cn } from '../../lib/cn'
import { DISABLED_CREATE_BUTTON } from '../../lib/classes'
import { useContextualCreate } from '../../state/use-contextual-create'
import { usePlatformModifier } from '../../state/use-platform'
import { useWorkspace } from '../../state/workspace-context'
import { Kbd } from '../../ui/Kbd/Kbd'
import { Resizer } from '../../ui/Resizer/Resizer'
import { usePanelResizer } from '../../ui/Resizer/use-resizer'
import { LibraryNav } from '../LibraryNav/LibraryNav'
import { TagList } from '../TagList/TagList'

export function Sidebar(): JSX.Element {
  const { sidebarCollapsed, zenMode } = useWorkspace()
  const modifier = usePlatformModifier()
  const create = useContextualCreate()
  const { size, isResizing, resizerProps } = usePanelResizer({
    storageKey: 'sidebar',
    defaultSize: 220,
    min: 160,
    max: 320,
    label: 'Resize sidebar'
  })

  const actionLabel = `${create.label} (${modifier} N)`
  // The expanded width only applies on `lg`; below it the sidebar keeps its
  // 56 px rail, as before. The resizer is hidden there too.
  const style = {
    '--sidebar-width': `${size}px`,
    ...(zenMode ? { width: 0, minWidth: 0 } : {})
  } as CSSProperties

  return (
    <aside
      aria-label="Library"
      aria-hidden={zenMode || undefined}
      inert={zenMode || undefined}
      style={style}
      className={cn(
        'relative flex w-14 min-w-14 shrink-0 flex-col justify-between overflow-hidden bg-base-200 select-none',
        zenMode ? 'border-r-0' : 'border-r border-base-300',
        sidebarCollapsed ? '' : 'lg:w-[var(--sidebar-width)] lg:min-w-[var(--sidebar-width)]',
        !isResizing &&
          'transition-[width,min-width] duration-200 ease-out motion-reduce:transition-none'
      )}
    >
      <div
        className={cn(
          'flex h-full min-h-0 w-full flex-col',
          sidebarCollapsed ? '' : 'lg:w-[var(--sidebar-width)]'
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
            aria-label={actionLabel}
            title={actionLabel}
            disabled={create.disabled}
            onClick={create.start}
            className={cn(
              'flex h-8 w-full items-center justify-center gap-2 rounded border border-line-strong bg-neutral text-xs font-medium text-base-content transition hover:bg-neutral/80',
              DISABLED_CREATE_BUTTON
            )}
          >
            <PlusCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span
              className={cn('items-center gap-2', sidebarCollapsed ? 'hidden' : 'hidden lg:flex')}
            >
              {create.label}
              <Kbd>{`${modifier} N`}</Kbd>
            </span>
          </button>
        </div>
      </div>

      {sidebarCollapsed || zenMode ? null : (
        <Resizer {...resizerProps} className="absolute inset-y-0 right-0 z-10 hidden lg:flex" />
      )}
    </aside>
  )
}
