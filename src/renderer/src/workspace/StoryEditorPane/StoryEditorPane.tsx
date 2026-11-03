import type { JSX } from 'react'
import type { Story } from '../../data/types'
import { StoryEditor } from '../StoryEditor/StoryEditor'
import { StoryHeader } from '../StoryHeader/StoryHeader'

type StoryEditorPaneProps = {
  story: Story | null
}

export function StoryEditorPane({ story }: StoryEditorPaneProps): JSX.Element {
  return (
    <section
      aria-label={story ? 'Story' : undefined}
      className="flex min-w-0 flex-1 flex-col bg-base-100"
    >
      {story ? <StoryHeader story={story} /> : null}

      <StoryEditor stored={story} />
    </section>
  )
}
