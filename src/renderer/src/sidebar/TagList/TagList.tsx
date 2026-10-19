import type { JSX } from 'react'
import { cn } from '../../lib/cn'
import { useLibrary } from '../../state/library-context'
import { useWorkspace, useWorkspaceDispatch } from '../../state/workspace-context'

type TagListProps = {
  collapsed: boolean
}

export function TagList({ collapsed }: TagListProps): JSX.Element | null {
  const { tags } = useLibrary()
  const { tagFilter } = useWorkspace()
  const dispatch = useWorkspaceDispatch()

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
              onClick={() => dispatch({ type: 'filter/tag', tag: active ? null : tag })}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1 text-xs transition',
                active
                  ? 'border border-neutral/60 bg-neutral/80 font-medium text-base-content'
                  : 'text-base-content/75 hover:bg-neutral/40 hover:text-base-content'
              )}
            >
              <span className="shrink-0 font-mono text-base-content/50">#</span>
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
