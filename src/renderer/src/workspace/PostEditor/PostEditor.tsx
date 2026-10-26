import type { EditorView } from '@codemirror/view'
import { useEffect, useState, type JSX } from 'react'
import { emptyPost } from '../../data/drafts'
import { useDataPort } from '../../data/port-context'
import type { Post } from '../../data/types'
import { TextEditor } from '../../editor/TextEditor/TextEditor'
import { useLibrary } from '../../state/library-context'
import { registerSave } from '../../state/save-registry'
import { publishUnsavedDraft } from '../../state/status-store'
import { useDraftPersistence } from '../../state/use-draft-persistence'
import { useEditorStatus } from '../../state/use-editor-status'
import { useWorkspaceNavigation } from '../../state/use-navigation'
import { useWorkspace, useWorkspaceDispatch } from '../../state/workspace-context'
import { EditorError } from '../../ui/EditorError/EditorError'
import { EditorPreviewLayout } from '../EditorPreviewLayout/EditorPreviewLayout'
import { EditorToolbar } from '../EditorToolbar/EditorToolbar'
import { PostBand } from '../PostBand/PostBand'
import { SourcePane } from '../SourcePane/SourcePane'
import { postSource } from '../source-state'

type PostEditorProps = {
  stored: Post | null
}

function hasContent(post: Post): boolean {
  return post.Topic.trim() !== '' || post.Text.trim() !== ''
}

export function PostEditor({ stored }: PostEditorProps): JSX.Element {
  const port = useDataPort()
  const {
    stories,
    articles,
    articleById,
    storyById,
    storiesStatus,
    articlesStatus,
    reloadStories,
    reloadArticles,
    upsertPost
  } = useLibrary()
  const { storyPaneExpanded } = useWorkspace()
  const dispatch = useWorkspaceDispatch()
  const navigate = useWorkspaceNavigation()
  const creating = stored === null
  const [draft, setDraft] = useState<Post>(stored ?? emptyPost())
  const [view, setView] = useState<EditorView | null>(null)

  const canPersist = (value: Post): boolean => value.Topic.trim() !== ''

  const { status, error, schedule, saveNow } = useDraftPersistence<Post>({
    initialStatus: creating ? 'incomplete' : 'saved',
    canPersist,
    create: (value) =>
      port.createPost({
        topic: value.Topic,
        text: value.Text,
        storyId: value.StoryID,
        articleId: value.ArticleID
      }),
    update: (value) => port.updatePost(value),
    onStored: (value, wasCreated) => {
      upsertPost(value)
      publishUnsavedDraft(false)

      if (wasCreated) {
        setDraft(value)
        dispatch({ type: 'create/cancel' })
        navigate({ type: 'post/select', postId: value.ID })
      }
    }
  })

  const { publishCursor } = useEditorStatus({ text: draft.Text, status })
  const source = postSource(draft.StoryID, draft.ArticleID, {
    storyById,
    articleById,
    storiesStatus,
    articlesStatus
  })

  useEffect(() => {
    registerSave(saveNow)

    return () => registerSave(null)
  }, [saveNow])

  const change = (next: Post): void => {
    setDraft(next)
    // What cannot be persisted, and would be lost by leaving, is what the
    // navigation guard must ask about — a blanked topic included.
    publishUnsavedDraft(hasContent(next) && !canPersist(next))
    schedule(next)
  }

  return (
    <section aria-label="Post editor" className="flex min-h-0 min-w-0 flex-1 flex-col bg-base-100">
      <PostBand
        topic={draft.Topic}
        state={draft.State}
        scheduledAt={draft.ScheduledAt}
        storyId={draft.StoryID}
        articleId={draft.ArticleID}
        stories={stories}
        articles={articles}
        creating={creating}
        onTopic={(topic) => change({ ...draft, Topic: topic })}
        onState={(state) =>
          change({
            ...draft,
            State: state,
            ScheduledAt: state === 'scheduled' ? draft.ScheduledAt : null
          })
        }
        onScheduledAt={(scheduledAt) => change({ ...draft, ScheduledAt: scheduledAt })}
        onSource={(storyId, articleId) =>
          change({ ...draft, StoryID: storyId, ArticleID: articleId })
        }
        onDiscard={() => dispatch({ type: 'create/cancel' })}
      />

      <div className="flex min-h-0 flex-1">
        <SourcePane
          source={source}
          subject="post"
          creating={creating}
          expanded={storyPaneExpanded}
          onToggle={() => dispatch({ type: 'storyPane/toggle' })}
          onRetry={draft.StoryID !== null ? reloadStories : reloadArticles}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <EditorPreviewLayout
            toolbar={<EditorToolbar view={view} />}
            editor={
              <TextEditor
                value={draft.Text}
                onChange={(text) => change({ ...draft, Text: text })}
                onCursorChange={publishCursor}
                onCreate={setView}
              />
            }
            markdown={draft.Text}
            view={view}
          />
        </div>
      </div>

      {status === 'error' ? <EditorError message={error} onRetry={() => void saveNow()} /> : null}
    </section>
  )
}
