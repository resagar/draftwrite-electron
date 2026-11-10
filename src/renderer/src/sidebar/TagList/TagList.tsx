import type { JSX } from 'react'
import { cn } from '../../lib/cn'
import { useLibrary } from '../../state/library-context'
import { useWorkspace, useWorkspaceDispatch } from '../../state/workspace-context'
import { useTags } from '../../tags/tag-context'
import { tagStyle } from '../../tags/tag-style'

type TagListProps = {
  collapsed: boolean
}

export function TagList({ collapsed }: TagListProps): JSX.Element | null {
  const { tags } = useLibrary()
  const { tagFilter } = useWorkspace()
  const dispatch = useWorkspaceDispatch()
  const { colors, openMenu } = useTags()

  if (tags.length === 0) {
    return null
  }

  return (
    <div>
      <h2
        className={cn(
          'px-2 pb-1.5 text-2xs font-semibold tracking-wider uppercase text-base-content/60',
          collapsed ? 'hidden' : 'hidden lg:block'
        )}
      >
        Tags
      </h2>
      <div className="space-y-0.5">
        {tags.map((tag) => {
          const active = tagFilter === tag

          return (
            <button
              key={tag}
              type="button"
              aria-label={tag}
              aria-pressed={active}
              title={tag}
              aria-haspopup="menu"
              onContextMenu={(event) => {
                event.preventDefault()
                openMenu({
                  name: tag,
                  x: event.clientX,
                  y: event.clientY,
                  anchor: event.currentTarget
                })
              }}
              onKeyDown={(event) => {
                if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                  event.preventDefault()
                  const rect = event.currentTarget.getBoundingClientRect()
                  openMenu({ name: tag, x: rect.left, y: rect.bottom, anchor: event.currentTarget })
                }
              }}
              onClick={() => dispatch({ type: 'filter/tag', tag: active ? null : tag })}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1 text-xs transition',
                active
                  ? 'border border-neutral/60 bg-neutral/80 font-medium text-base-content'
                  : 'text-base-content/75 hover:bg-neutral/40 hover:text-base-content'
              )}
            >
              <span aria-hidden="true" className="tag-dot shrink-0" style={tagStyle(colors[tag])} />
              <span className={cn('truncate', collapsed ? 'hidden' : 'hidden lg:inline')}>
                {tag}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
