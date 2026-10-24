import type { JSX, ReactNode } from 'react'
import { Resizer } from '../../ui/Resizer/Resizer'
import { usePanelResizer } from '../../ui/Resizer/use-resizer'

type ListColumnProps = {
  title: string
  count?: number
  headerActions?: ReactNode
  children: ReactNode
}

export function ListColumn({
  title,
  count,
  headerActions,
  children
}: ListColumnProps): JSX.Element {
  const { size, resizerProps } = usePanelResizer({
    storageKey: 'list',
    defaultSize: 280,
    min: 200,
    max: 420,
    label: 'Resize list'
  })

  return (
    <section
      aria-label={title}
      style={{ width: size, minWidth: size }}
      className="relative flex shrink-0 flex-col border-r border-base-300 bg-base-200/90"
    >
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

      <Resizer {...resizerProps} className="absolute inset-y-0 right-0 z-10" />
    </section>
  )
}
