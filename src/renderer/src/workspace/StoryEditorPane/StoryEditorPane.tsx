import type { JSX } from 'react'
import type { Story } from '../../data/types'
import { StoryEditor } from '../StoryEditor/StoryEditor'

type StoryEditorPaneProps = {
  story: Story | null
}

export function StoryEditorPane({ story }: StoryEditorPaneProps): JSX.Element {
  return (
    <section
      aria-label={story ? 'Story' : undefined}
      className="content-layer flex min-w-0 flex-1 flex-col bg-base-100"
    >
      <StoryEditor stored={story} />
    </section>
  )
}
