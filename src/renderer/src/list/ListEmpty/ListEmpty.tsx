import type { JSX, ReactNode } from 'react'

type ListEmptyProps = {
  filtered: boolean
  icon: ReactNode
  title: string
  description: string
  onClearFilter: () => void
  action?: ReactNode
}

export function ListEmpty({
  filtered,
  icon,
  title,
  description,
  onClearFilter,
  action
}: ListEmptyProps): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <span aria-hidden="true" className="text-base-content/40">
        {icon}
      </span>
      <h2 className="text-xs font-semibold text-base-content/80">{title}</h2>
      <p className="max-w-[30ch] text-xs text-base-content/60">{description}</p>
      {filtered ? (
        <button
          type="button"
          onClick={onClearFilter}
          className="mt-1 rounded border border-line bg-neutral px-2 py-1 text-xs text-base-content transition hover:bg-neutral/80"
        >
          Clear filter
        </button>
      ) : (
        action
      )}
    </div>
  )
}
