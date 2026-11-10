import { useTagMutations } from '../../state/tag-mutation-context'
import type { EditorView } from '@codemirror/view'
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { emptyArticle } from '../../data/drafts'
import { useDataPort } from '../../data/port-context'
import type { Article } from '../../data/types'
import { TextEditor } from '../../editor/TextEditor/TextEditor'
import { usePublishArticleTarget } from '../../state/article-target-context'
import { usePublishEditorActions, type EditorActionSet } from '../../state/editor-actions-context'
import { useLibrary } from '../../state/library-context'
import { registerSave } from '../../state/save-registry'
import { publishUnsavedDraft } from '../../state/status-store'
import { useDraftPersistence } from '../../state/use-draft-persistence'
import { useEditorStatus } from '../../state/use-editor-status'
import { useWorkspace, useWorkspaceDispatch } from '../../state/workspace-context'
import { EditorError } from '../../ui/EditorError/EditorError'
import { ArticleBand } from '../ArticleBand/ArticleBand'
import { EditorPreviewLayout } from '../EditorPreviewLayout/EditorPreviewLayout'
import { EditorialWorkspace } from '../EditorialWorkspace/EditorialWorkspace'

type ArticleEditorProps = {
  stored: Article | null
  // Only read while creating: a stored article already carries its StoryID.
  initialStoryId?: string
  onStoryChange?: (storyId: string) => void
}

function hasContent(article: Article): boolean {
  return (
    article.StoryID.trim() !== '' ||
    article.Title.trim() !== '' ||
    article.Subtitle.trim() !== '' ||
    article.Target.trim() !== '' ||
    article.Text.trim() !== '' ||
    article.Tags.length > 0
  )
}

export function ArticleEditor({
  stored,
  initialStoryId = '',
  onStoryChange
}: ArticleEditorProps): JSX.Element {
  const port = useDataPort()
  const mutations = useTagMutations()
  const { allStories, upsertArticle } = useLibrary()
  const dispatch = useWorkspaceDispatch()
  const { editorSession } = useWorkspace()
  const creating = stored === null
  const [draft, setDraft] = useState<Article>(stored ?? emptyArticle(initialStoryId))
  const [view, setView] = useState<EditorView | null>(null)
  useEffect(
    () =>
      mutations.subscribe((name) => {
        setDraft((current) => ({ ...current, Tags: current.Tags.filter((tag) => tag !== name) }))
      }),
    [mutations]
  )
  const [storyLocked, setStoryLocked] = useState(false)
  const [editorialOpen, setEditorialOpen] = useState(false)
  const openVersions = useCallback(() => setEditorialOpen(true), [])

  const canPersist = (value: Article): boolean =>
    value.StoryID.trim() !== '' && value.Title.trim() !== ''

  const { status, error, schedule, saveNow } = useDraftPersistence<Article>({
    initialStatus: creating ? 'incomplete' : 'saved',
    canPersist,
    create: async (value) => {
      setStoryLocked(true)
      try {
        return await port.createArticle({
          storyId: value.StoryID,
          title: value.Title,
          subtitle: value.Subtitle,
          target: value.Target,
          tags: value.Tags,
          text: value.Text
        })
      } catch (caught) {
        setStoryLocked(false)
        throw caught
      }
    },
    update: (value) => port.updateArticle(value),
    onStored: (value, wasCreated) => {
      upsertArticle(value)

      if (wasCreated) {
        setDraft((current) => ({
          ...current,
          ID: value.ID,
          CreatedAt: value.CreatedAt,
          UpdatedAt: value.UpdatedAt
        }))
        dispatch({ type: 'create/complete', kind: 'article', id: value.ID, session: editorSession })
      }
    }
  })

  const { publishCursor } = useEditorStatus({ text: draft.Text, status })
  const publishTarget = usePublishArticleTarget()

  useEffect(() => {
    if (editorialOpen) return
    registerSave(saveNow)

    return () => registerSave(null)
  }, [saveNow, editorialOpen])

  const change = (next: Article): void => {
    setDraft(next)
    // What cannot be persisted, and would be lost by leaving, is what the
    // navigation guard must ask about — a blanked title included.
    publishUnsavedDraft(hasContent(next) && !canPersist(next))
    schedule(next)
  }

  const latestDraft = useRef(draft)
  const latestChange = useRef(change)

  useEffect(() => {
    latestDraft.current = draft
    latestChange.current = change
  })

  // The target panel lives beside the editor, so the draft is projected to it
  // instead of duplicated. The save keeps using the latest draft and writer,
  // otherwise a stale copy would blank the fields typed since the projection.
  useEffect(() => {
    publishTarget({
      articleId: draft.ID,
      value: draft.Target,
      save: (next) => latestChange.current({ ...latestDraft.current, Target: next })
    })
  }, [publishTarget, draft.ID, draft.Target])

  useEffect(() => () => publishTarget(null), [publishTarget])

  const editorActions = useMemo<EditorActionSet>(
    () => ({
      deleteRequest: stored === null ? null : { kind: 'delete-article', articleId: stored.ID },
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
        kind="article"
        pieceId={draft.ID}
        onLibraryChange={() => {
          void port.listArticles().then((values) => values.forEach(upsertArticle))
        }}
        onClose={(workspace) => {
          const content = workspace.variants.find((v) => v.id === workspace.primaryId)!.content
          if (content.kind === 'article')
            setDraft((current) => ({
              ...current,
              Title: content.title,
              Subtitle: content.subtitle,
              Target: content.target,
              Text: content.text
            }))
          setEditorialOpen(false)
          void port.listArticles().then((values) => values.forEach(upsertArticle))
        }}
      />
    )

  return (
    <section
      aria-label="Article editor"
      className="content-layer flex min-h-0 min-w-0 flex-1 flex-col bg-base-100"
    >
      <ArticleBand
        stories={allStories}
        storyId={draft.StoryID}
        title={draft.Title}
        subtitle={draft.Subtitle}
        tags={draft.Tags}
        onTags={(tags) => change({ ...draft, Tags: tags })}
        creating={creating}
        storyLocked={storyLocked}
        onStory={(storyId) => {
          if (!creating || storyLocked) return
          change({ ...draft, StoryID: storyId })
          if (creating) {
            onStoryChange?.(storyId)
          }
        }}
        onTitle={(title) => change({ ...draft, Title: title })}
        onSubtitle={(subtitle) => change({ ...draft, Subtitle: subtitle })}
        onDiscard={() => dispatch({ type: 'create/cancel' })}
      />

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

      {status === 'error' ? <EditorError message={error} onRetry={() => void saveNow()} /> : null}
    </section>
  )
}
