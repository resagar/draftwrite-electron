import { Feather } from 'lucide-react'
import type { JSX } from 'react'
import { cn } from '../../lib/cn'
import { isWindowDragHeader } from '../../shell/chrome-mode'
import type { WindowChrome } from '../../shell/TitleBar/use-window-chrome'

type SidebarHeaderProps = {
  chrome?: WindowChrome
  collapsed: boolean
}

/**
 * Top strip of the library column: the app wordmark that used to live in the
 * title bar. It matches the title bar height so both columns start together,
 * and it drags the window when the native title bar is hidden.
 */
export function SidebarHeader({ chrome, collapsed }: SidebarHeaderProps): JSX.Element {
  return (
    <div
      className={cn(
        'sidebar-header flex h-9 min-h-9 w-full shrink-0 items-center gap-2 px-3',
        collapsed ? 'justify-center' : 'justify-center lg:justify-start',
        isWindowDragHeader(chrome) && 'shell-drag'
      )}
    >
      <Feather aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span
        className={cn(
          'truncate text-xs font-semibold tracking-wide',
          collapsed ? 'hidden' : 'hidden lg:block'
        )}
      >
        DraftWrite
      </span>
    </div>
  )
}
