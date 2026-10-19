import type { JSX } from 'react'
import { cn } from '../../lib/cn'

type TagChipProps = {
  tag: string
  className?: string
}

export function TagChip({ tag, className }: TagChipProps): JSX.Element {
  return (
    <span
      className={cn(
        'max-w-full truncate rounded bg-base-300 px-1.5 py-0.5 font-mono text-2xs text-base-content/70',
        className
      )}
    >
      #{tag}
    </span>
  )
}
