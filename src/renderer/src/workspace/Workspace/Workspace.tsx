import { BookOpen } from 'lucide-react'
import type { JSX } from 'react'
import { useLibrary } from '../../state/library-context'
import { useWorkspace } from '../../state/workspace-context'
import { EmptyState } from '../../ui/EmptyState/EmptyState'
import { ArticleEditor } from '../ArticleEditor/ArticleEditor'
import { ArticlePane } from '../ArticlePane/ArticlePane'
import { StoryEditor } from '../StoryEditor/StoryEditor'
import { StoryPane } from '../StoryPane/StoryPane'

export function Workspace(): JSX.Element {
  const { creating, creatingStoryId, selectedArticleId, selectedStoryId, storyPaneVisible } =
    useWorkspace()
  const { articleById, storyById } = useLibrary()

  if (creating === 'story') {
    return (
      <section aria-label="Workspace" className="flex min-w-0 flex-1 overflow-hidden bg-base-100">
        <StoryEditor stored={null} />
      </section>
    )
  }

  if (creating === 'article') {
    return (
      <section aria-label="Workspace" className="flex min-w-0 flex-1 overflow-hidden bg-base-100">
        <ArticleEditor stored={null} initialStoryId={creatingStoryId ?? ''} />
      </section>
    )
  }

  const article = articleById(selectedArticleId)

  if (article !== null) {
    const story = storyById(article.StoryID)

    return (
      <section aria-label="Workspace" className="flex min-w-0 flex-1 overflow-hidden bg-base-100">
        <div
          className={
            storyPaneVisible ? 'flex min-h-0 min-w-0 flex-1 xl:flex-none' : 'hidden xl:flex'
          }
        >
          <StoryPane story={story} storyId={article.StoryID} />
        </div>
        <ArticlePane article={article} story={story} />
      </section>
    )
  }

  const story = storyById(selectedStoryId)

  if (story !== null) {
    return (
      <section aria-label="Workspace" className="flex min-w-0 flex-1 overflow-hidden bg-base-100">
        <StoryEditor key={story.ID} stored={story} />
      </section>
    )
  }

  return (
    <section aria-label="Workspace" className="flex min-w-0 flex-1 flex-col bg-base-100">
      <EmptyState
        icon={<BookOpen className="h-8 w-8" />}
        title="Nothing selected"
        description="Pick a story to write it, or an article to work on it."
      />
    </section>
  )
}
