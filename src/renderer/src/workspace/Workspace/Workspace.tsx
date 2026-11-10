import { BookOpen } from 'lucide-react'
import type { JSX } from 'react'
import { ArticleTargetProvider } from '../../state/article-target-context'
import { useLibrary } from '../../state/library-context'
import { useWorkspace, useWorkspaceDispatch } from '../../state/workspace-context'
import { EmptyState } from '../../ui/EmptyState/EmptyState'
import { ArticlePane } from '../ArticlePane/ArticlePane'
import { PostPane } from '../PostPane/PostPane'
import { storySource } from '../source-state'
import { StoryEditorPane } from '../StoryEditorPane/StoryEditorPane'
import { SourcePane, type SourceState } from '../SourcePane/SourcePane'
import { ArticleTargetFooter } from '../TargetPanel/ArticleTargetFooter'

export function Workspace(): JSX.Element {
  const {
    creating,
    editorSession,
    creatingStoryId,
    selectedArticleId,
    selectedStoryId,
    selectedPostId,
    storyPaneExpanded
  } = useWorkspace()
  const dispatch = useWorkspaceDispatch()
  const { articleById, storyById, postById, storiesStatus, reloadStories } = useLibrary()

  if (creating === 'story') {
    return (
      <section aria-label="Workspace" className="flex min-w-0 flex-1 overflow-hidden bg-base-100">
        <StoryEditorPane key={editorSession} story={null} />
      </section>
    )
  }

  if (creating === 'post') {
    return (
      <section aria-label="Workspace" className="flex min-w-0 flex-1 overflow-hidden bg-base-100">
        <PostPane key={editorSession} post={null} />
      </section>
    )
  }

  const article = creating === 'article' ? null : articleById(selectedArticleId)
  const creatingArticle = creating === 'article'

  if (creatingArticle || article !== null) {
    const storyId = creatingArticle ? (creatingStoryId ?? '') : (article?.StoryID ?? '')
    const story = storyById(storyId)
    const source: SourceState =
      storyId === '' ? { kind: 'empty' } : storySource(storyId, story, storiesStatus)

    return (
      <ArticleTargetProvider>
        <section aria-label="Workspace" className="flex min-w-0 flex-1 overflow-hidden bg-base-100">
          <SourcePane
            source={source}
            subject="article"
            creating={creatingArticle}
            expanded={storyPaneExpanded}
            onToggle={() => dispatch({ type: 'storyPane/toggle' })}
            onRetry={reloadStories}
            footer={<ArticleTargetFooter />}
          />
          <ArticlePane
            key={editorSession}
            article={article}
            initialStoryId={storyId}
            onStoryChange={(nextStoryId) =>
              dispatch({ type: 'create/story', storyId: nextStoryId })
            }
          />
        </section>
      </ArticleTargetProvider>
    )
  }

  const story = storyById(selectedStoryId)

  if (story !== null) {
    return (
      <section aria-label="Workspace" className="flex min-w-0 flex-1 overflow-hidden bg-base-100">
        <StoryEditorPane key={editorSession} story={story} />
      </section>
    )
  }

  const post = postById(selectedPostId)

  if (post !== null) {
    return (
      <section aria-label="Workspace" className="flex min-w-0 flex-1 overflow-hidden bg-base-100">
        <PostPane key={editorSession} post={post} />
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
