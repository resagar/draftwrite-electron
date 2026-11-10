import type { JSX } from 'react'
import { cn } from '../../lib/cn'
import { useTags } from '../../tags/tag-context'
import { tagStyle } from '../../tags/tag-style'

type TagChipProps = {
  tag: string
  className?: string
}

export function TagChip({ tag, className }: TagChipProps): JSX.Element {
  const { colors, openMenu } = useTags()
  return (
    <span
      role="button"
      tabIndex={0}
      aria-haspopup="menu"
      aria-label={`Tag ${tag}`}
      title={tag}
      style={tagStyle(colors[tag])}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        openMenu({ name: tag, x: event.clientX, y: event.clientY, anchor: event.currentTarget })
      }}
      onKeyDown={(event) => {
        if (
          ['ContextMenu', 'Enter', ' '].includes(event.key) ||
          (event.shiftKey && event.key === 'F10')
        ) {
          event.preventDefault()
          event.stopPropagation()
          const rect = event.currentTarget.getBoundingClientRect()
          openMenu({ name: tag, x: rect.left, y: rect.bottom, anchor: event.currentTarget })
        }
      }}
      onClick={(event) => {
        event.stopPropagation()
        const rect = event.currentTarget.getBoundingClientRect()
        openMenu({ name: tag, x: rect.left, y: rect.bottom, anchor: event.currentTarget })
      }}
      className={cn('tag-chip max-w-full cursor-pointer truncate text-2xs', className)}
    >
      {tag}
    </span>
  )
}
