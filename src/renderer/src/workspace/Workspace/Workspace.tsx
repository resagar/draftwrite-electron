import { BookOpen } from 'lucide-react'
import type { JSX } from 'react'
import { useLibrary } from '../../state/library-context'
import { useWorkspace, useWorkspaceDispatch } from '../../state/workspace-context'
import type { LoadStatus } from '../../state/use-list'
import type { Story } from '../../data/types'
import { EmptyState } from '../../ui/EmptyState/EmptyState'
import { ArticleEditor } from '../ArticleEditor/ArticleEditor'
import { ArticlePane } from '../ArticlePane/ArticlePane'
import { StoryEditor } from '../StoryEditor/StoryEditor'
import { StoryPane, type SourceStoryState } from '../StoryPane/StoryPane'

function sourceStory(storyId: string, story: Story | null, status: LoadStatus): SourceStoryState {
  if (story !== null) {
    return { kind: 'ready', storyId, story }
  }

  if (storyId === '') {
    return { kind: 'empty' }
  }

  if (status === 'loading') {
    return { kind: 'loading', storyId }
  }

  if (status === 'error') {
    return { kind: 'error', storyId }
  }

  return { kind: 'missing', storyId }
}

export function Workspace(): JSX.Element {
  const { creating, creatingStoryId, selectedArticleId, selectedStoryId, storyPaneExpanded } =
    useWorkspace()
  const dispatch = useWorkspaceDispatch()
  const { articleById, storyById, storiesStatus, reloadStories } = useLibrary()

  if (creating === 'story') {
    return (
      <section aria-label="Workspace" className="flex min-w-0 flex-1 overflow-hidden bg-base-100">
        <StoryEditor stored={null} />
      </section>
    )
  }

  const article = creating === 'article' ? null : articleById(selectedArticleId)
  const creatingArticle = creating === 'article'

  if (creatingArticle || article !== null) {
    const storyId = creatingArticle ? (creatingStoryId ?? '') : (article?.StoryID ?? '')
    const story = storyById(storyId)
    const source = sourceStory(storyId, story, storiesStatus)

    return (
      <section aria-label="Workspace" className="flex min-w-0 flex-1 overflow-hidden bg-base-100">
        <StoryPane
          source={source}
          creating={creatingArticle}
          expanded={storyPaneExpanded}
          onToggle={() => dispatch({ type: 'storyPane/toggle' })}
          onRetry={reloadStories}
        />
        {creatingArticle ? (
          <ArticleEditor
            stored={null}
            initialStoryId={storyId}
            onStoryChange={(nextStoryId) =>
              dispatch({ type: 'create/story', storyId: nextStoryId })
            }
          />
        ) : article !== null ? (
          <ArticlePane article={article} story={story} />
        ) : null}
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
