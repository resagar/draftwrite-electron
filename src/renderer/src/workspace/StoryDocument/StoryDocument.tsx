import type { JSX } from 'react'
import type { Story } from '../../data/types'
import { StoryEditor } from '../StoryEditor/StoryEditor'
import { StoryHeader } from '../StoryHeader/StoryHeader'

type StoryDocumentProps = {
  story: Story
}

export function StoryDocument({ story }: StoryDocumentProps): JSX.Element {
  return (
    <section aria-label="Story" className="flex min-w-0 flex-1 flex-col bg-base-100">
      <StoryHeader story={story} />

      <StoryEditor key={story.ID} stored={story} />
    </section>
  )
}
