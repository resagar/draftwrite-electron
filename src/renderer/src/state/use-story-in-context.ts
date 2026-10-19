import type { Story } from '../data/types'
import { useLibrary } from './library-context'
import { useWorkspace } from './workspace-context'

export type StoryInContext = {
  story: Story | null
  hasStories: boolean
}

// The Story in context: the source of the open Article, or the selected Story
// when no Article is open. A missing source Story has no fallback, matching the
// article list. The library state also tells whether there is any Story at all.
export function useStoryInContext(): StoryInContext {
  const { selectedArticleId, selectedStoryId } = useWorkspace()
  const { articleById, storiesTotal, storyById } = useLibrary()

  const story =
    selectedArticleId === null
      ? storyById(selectedStoryId)
      : storyById(articleById(selectedArticleId)?.StoryID ?? null)

  return { story, hasStories: storiesTotal > 0 }
}
