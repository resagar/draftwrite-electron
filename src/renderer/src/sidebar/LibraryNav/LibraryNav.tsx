import { FileText, Inbox, Send } from 'lucide-react'
import type { JSX, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { useWorkspaceNavigation } from '../../state/use-navigation'
import { useWorkspace, type Library } from '../../state/workspace-context'

type LibraryNavProps = {
  collapsed: boolean
}

export function LibraryNav({ collapsed }: LibraryNavProps): JSX.Element {
  const { library } = useWorkspace()
  const navigate = useWorkspaceNavigation()
  const labelClass = cn(collapsed ? 'hidden' : 'hidden truncate lg:inline')

  const renderEntry = (value: Library, label: string, icon: ReactNode): JSX.Element => {
    const active = library === value

    return (
      <button
        type="button"
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        title={label}
        onClick={() => navigate({ type: 'library/select', library: value })}
        className={cn(
          'flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition',
          active
            ? 'border border-neutral/60 bg-neutral/80 font-medium text-base-content'
            : 'text-base-content/75 hover:bg-neutral/40 hover:text-base-content'
        )}
      >
        {icon}
        <span className={labelClass}>{label}</span>
      </button>
    )
  }

  return (
    <nav className="space-y-0.5">
      {renderEntry(
        'stories',
        'Stories',
        <Inbox aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" />
      )}
      {renderEntry(
        'articles',
        'Articles',
        <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-secondary" />
      )}
      {renderEntry(
        'posts',
        'Posts',
        <Send aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-warning" />
      )}
    </nav>
  )
}
