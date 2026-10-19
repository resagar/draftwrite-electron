import type { JSX } from 'react'
import { excerpt, formatRelativeDate } from '../../data/format'
import { cn } from '../../lib/cn'
import { TagChip } from '../../ui/TagChip/TagChip'

type ListRowItemProps = {
  title: string
  updatedAt: string
  text: string
  tags?: string[]
  selected: boolean
}

export function ListRowItem({
  title,
  updatedAt,
  text,
  tags = [],
  selected
}: ListRowItemProps): JSX.Element {
  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <h3
          className={cn(
            'truncate text-xs text-base-content/90',
            selected ? 'font-semibold' : 'font-medium'
          )}
        >
          {title}
        </h3>
        <span className="shrink-0 font-mono text-2xs text-base-content/60">
          {formatRelativeDate(updatedAt)}
        </span>
      </div>

      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-base-content/70">
        {excerpt(text)}
      </p>

      {tags.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {tags.map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
        </div>
      ) : null}
    </>
  )
}
