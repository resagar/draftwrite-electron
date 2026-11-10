import { useTagMutations } from '../../state/tag-mutation-context'
import type { EditorView } from '@codemirror/view'
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { emptyPost } from '../../data/drafts'
import { useDataPort } from '../../data/port-context'
import type { Post } from '../../data/types'
import { TextEditor } from '../../editor/TextEditor/TextEditor'
import { usePublishEditorActions, type EditorActionSet } from '../../state/editor-actions-context'
import { useLibrary } from '../../state/library-context'
import { registerSave } from '../../state/save-registry'
import { publishUnsavedDraft } from '../../state/status-store'
import { useDraftPersistence } from '../../state/use-draft-persistence'
import { useEditorStatus } from '../../state/use-editor-status'
import { useWorkspace, useWorkspaceDispatch } from '../../state/workspace-context'
import { EditorError } from '../../ui/EditorError/EditorError'
import { EditorPreviewLayout } from '../EditorPreviewLayout/EditorPreviewLayout'
import { PostBand } from '../PostBand/PostBand'
import { SourcePane } from '../SourcePane/SourcePane'
import { postSource } from '../source-state'
import { EditorialWorkspace } from '../EditorialWorkspace/EditorialWorkspace'

type PostEditorProps = {
  stored: Post | null
}

function hasContent(post: Post): boolean {
  return post.Topic.trim() !== '' || post.Text.trim() !== '' || post.Tags.length > 0
}

export function PostEditor({ stored }: PostEditorProps): JSX.Element {
  const port = useDataPort()
  const mutations = useTagMutations()
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
  const { storyPaneExpanded, editorSession } = useWorkspace()
  const dispatch = useWorkspaceDispatch()
  const creating = stored === null
  const [draft, setDraft] = useState<Post>(stored ?? emptyPost())
  const latestDraft = useRef(draft)
  useEffect(() => {
    latestDraft.current = draft
  }, [draft])
  const [view, setView] = useState<EditorView | null>(null)
  useEffect(
    () =>
      mutations.subscribe((name) => {
        setDraft((current) => ({ ...current, Tags: current.Tags.filter((tag) => tag !== name) }))
      }),
    [mutations]
  )
  const [editorialOpen, setEditorialOpen] = useState(false)
  const openVersions = useCallback(() => setEditorialOpen(true), [])

  const canPersist = (value: Post): boolean => value.Topic.trim() !== ''

  const { status, error, schedule, saveNow } = useDraftPersistence<Post>({
    initialStatus: creating ? 'incomplete' : 'saved',
    canPersist,
    create: (value) =>
      port.createPost({
        topic: value.Topic,
        tags: value.Tags,
        text: value.Text,
        storyId: value.StoryID,
        articleId: value.ArticleID
      }),
    update: (value) => port.updatePost(value),
    onStored: (value, wasCreated) => {
      upsertPost(value)

      if (wasCreated) {
        const next = {
          ...latestDraft.current,
          ID: value.ID,
          CreatedAt: value.CreatedAt,
          UpdatedAt: value.UpdatedAt
        }
        latestDraft.current = next
        setDraft(next)
        // Creation always starts pending; persist any state chosen in the draft.
        if (next.State !== value.State || next.ScheduledAt !== value.ScheduledAt) schedule(next)
        dispatch({ type: 'create/complete', kind: 'post', id: value.ID, session: editorSession })
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
  const sourceName =
    source.kind === 'ready'
      ? source.content.kind === 'story'
        ? source.content.story.Topic
        : source.content.article.Title
      : source.kind === 'empty'
        ? 'No source'
        : source.kind === 'loading'
          ? 'Loading source…'
          : draft.StoryID !== null
            ? 'Unavailable story'
            : 'Unavailable article'

  useEffect(() => {
    if (editorialOpen) return
    registerSave(saveNow)

    return () => registerSave(null)
  }, [saveNow, editorialOpen])

  const change = (next: Post): void => {
    latestDraft.current = next
    setDraft(next)
    // What cannot be persisted, and would be lost by leaving, is what the
    // navigation guard must ask about — a blanked topic included.
    publishUnsavedDraft(hasContent(next) && !canPersist(next))
    schedule(next)
  }

  const editorActions = useMemo<EditorActionSet>(
    () => ({
      deleteRequest: stored === null ? null : { kind: 'delete-post', postId: stored.ID },
      versions:
        stored !== null && Boolean(port.editorial) && !editorialOpen
          ? { disabled: !draft.ID || status !== 'saved', open: openVersions }
          : null
    }),
    [stored, port.editorial, editorialOpen, draft.ID, status, openVersions]
  )

  usePublishEditorActions(editorActions)

  if (editorialOpen)
    return (
      <EditorialWorkspace
        kind="post"
        pieceId={draft.ID}
        onLibraryChange={() => {
          void port.listPosts().then((values) => values.forEach(upsertPost))
        }}
        onClose={(workspace) => {
          const content = workspace.variants.find((v) => v.id === workspace.primaryId)!.content
          if (content.kind === 'post') {
            const next = { ...latestDraft.current, Topic: content.topic, Text: content.text }
            latestDraft.current = next
            setDraft(next)
          }
          setEditorialOpen(false)
          void port.listPosts().then((values) => values.forEach(upsertPost))
        }}
      />
    )

  return (
    <section
      aria-label="Post editor"
      className="content-layer flex min-h-0 min-w-0 flex-1 flex-col bg-base-100"
    >
      <PostBand
        topic={draft.Topic}
        tags={draft.Tags}
        onTags={(tags) => change({ ...draft, Tags: tags })}
        state={draft.State}
        scheduledAt={draft.ScheduledAt}
        storyId={draft.StoryID}
        articleId={draft.ArticleID}
        sourceName={sourceName}
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
