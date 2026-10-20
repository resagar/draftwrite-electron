import type { JSX } from 'react'
import type { Story } from '../../data/types'
import { ViewModeSwitcher } from '../ViewModeSwitcher/ViewModeSwitcher'

type StoryHeaderProps = {
  story: Story
}

export function StoryHeader({ story }: StoryHeaderProps): JSX.Element {
  return (
    <header className="flex h-9 min-h-9 items-center justify-between gap-3 border-b border-base-300 bg-base-200 px-4">
      <h2 className="min-w-0 truncate text-xs font-semibold">{story.Topic}</h2>

      <div className="flex shrink-0 items-center gap-2.5">
        <ViewModeSwitcher />
      </div>
    </header>
  )
}
