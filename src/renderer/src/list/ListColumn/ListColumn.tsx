import type { JSX, ReactNode } from 'react'

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
  return (
    <section
      aria-label={title}
      className="flex w-[280px] min-w-[280px] shrink-0 flex-col border-r border-base-300 bg-base-200/90 xl:w-[300px] xl:min-w-[300px]"
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
    </section>
  )
}
