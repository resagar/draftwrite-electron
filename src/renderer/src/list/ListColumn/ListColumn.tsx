import type { JSX, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Resizer } from '../../ui/Resizer/Resizer'
import { usePanelResizer } from '../../ui/Resizer/use-resizer'

type ListColumnProps = {
  title: string
  count?: number
  headerActions?: ReactNode
  collapsed?: boolean
  children: ReactNode
}

export function ListColumn({
  title,
  count,
  headerActions,
  collapsed = false,
  children
}: ListColumnProps): JSX.Element {
  const { size, isResizing, resizerProps } = usePanelResizer({
    storageKey: 'list',
    defaultSize: 280,
    min: 200,
    max: 420,
    label: 'Resize list'
  })
  const width = collapsed ? 0 : size

  return (
    <section
      aria-label={title}
      aria-hidden={collapsed || undefined}
      inert={collapsed || undefined}
      style={{ width, minWidth: width }}
      className={cn(
        'relative flex shrink-0 flex-col overflow-hidden bg-base-200/90',
        collapsed ? 'border-r-0' : 'border-r border-base-300',
        !isResizing &&
          'transition-[width,min-width] duration-200 ease-out motion-reduce:transition-none'
      )}
    >
      <div style={{ width: size }} className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-9 min-h-9 items-center justify-between gap-2 border-b border-base-300 bg-base-200 px-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="truncate text-xs font-semibold">{title}</h2>
            {count === undefined ? null : (
              <span className="shrink-0 font-mono text-xs text-base-content/60">({count})</span>
            )}
          </div>
          {headerActions}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>

      {collapsed ? null : <Resizer {...resizerProps} className="absolute inset-y-0 right-0 z-10" />}
    </section>
  )
}
