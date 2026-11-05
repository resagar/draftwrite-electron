import { GitBranch } from 'lucide-react'
import type { EditorView } from '@codemirror/view'
import { useEffect, useRef, useState, type JSX, type ReactNode } from 'react'
import { emptyArticle } from '../../data/drafts'
import { useDataPort } from '../../data/port-context'
import type { Article } from '../../data/types'
import { TextEditor } from '../../editor/TextEditor/TextEditor'
import { usePublishArticleTarget } from '../../state/article-target-context'
import { useLibrary } from '../../state/library-context'
import { registerSave } from '../../state/save-registry'
import { publishUnsavedDraft } from '../../state/status-store'
import { useDraftPersistence } from '../../state/use-draft-persistence'
import { useEditorStatus } from '../../state/use-editor-status'
import { useWorkspace, useWorkspaceDispatch } from '../../state/workspace-context'
import { IconButton } from '../../ui/IconButton/IconButton'
import { EditorError } from '../../ui/EditorError/EditorError'
import { ArticleBand } from '../ArticleBand/ArticleBand'
import { EditorPreviewLayout } from '../EditorPreviewLayout/EditorPreviewLayout'
import { EditorToolbar } from '../EditorToolbar/EditorToolbar'
import { EditorialWorkspace } from '../EditorialWorkspace/EditorialWorkspace'

type ArticleEditorProps = {
  renderHeader: (versionsAction: ReactNode) => ReactNode
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
    article.Text.trim() !== ''
  )
}

export function ArticleEditor({
  stored,
  renderHeader,
  initialStoryId = '',
  onStoryChange
}: ArticleEditorProps): JSX.Element {
  const port = useDataPort()
  const { allStories, upsertArticle } = useLibrary()
  const dispatch = useWorkspaceDispatch()
  const { editorSession } = useWorkspace()
  const creating = stored === null
  const [draft, setDraft] = useState<Article>(stored ?? emptyArticle(initialStoryId))
  const [view, setView] = useState<EditorView | null>(null)
  const [storyLocked, setStoryLocked] = useState(false)
  const [editorialOpen, setEditorialOpen] = useState(false)

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

  const header = renderHeader(
    port.editorial && !editorialOpen ? (
      <IconButton
        label="Versions and review"
        className="text-primary hover:text-primary"
        disabled={!draft.ID || status !== 'saved'}
        onClick={() => setEditorialOpen(true)}
      >
        <GitBranch aria-hidden="true" className="h-3.5 w-3.5" />
      </IconButton>
    ) : null
  )

  if (editorialOpen)
    return (
      <>
        {header}
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
      </>
    )

  return (
    <>
      {header}
      <section
        aria-label="Article editor"
        className="flex min-h-0 min-w-0 flex-1 flex-col bg-base-100"
      >
        <ArticleBand
          stories={allStories}
          storyId={draft.StoryID}
          title={draft.Title}
          subtitle={draft.Subtitle}
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

        {status === 'error' ? <EditorError message={error} onRetry={() => void saveNow()} /> : null}
      </section>
    </>
  )
}
