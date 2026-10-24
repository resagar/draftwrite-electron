import type { EditorView } from '@codemirror/view'
import { useEffect, useState, type JSX } from 'react'
import { emptyArticle } from '../../data/drafts'
import { useDataPort } from '../../data/port-context'
import type { Article } from '../../data/types'
import { TextEditor } from '../../editor/TextEditor/TextEditor'
import { useLibrary } from '../../state/library-context'
import { registerSave } from '../../state/save-registry'
import { publishUnsavedDraft } from '../../state/status-store'
import { useDraftPersistence } from '../../state/use-draft-persistence'
import { useEditorStatus } from '../../state/use-editor-status'
import { useWorkspaceNavigation } from '../../state/use-navigation'
import { useWorkspaceDispatch } from '../../state/workspace-context'
import { EditorError } from '../../ui/EditorError/EditorError'
import { ArticleBand } from '../ArticleBand/ArticleBand'
import { EditorPreviewLayout } from '../EditorPreviewLayout/EditorPreviewLayout'
import { EditorToolbar } from '../EditorToolbar/EditorToolbar'

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
    article.Text.trim() !== ''
  )
}

export function ArticleEditor({
  stored,
  initialStoryId = '',
  onStoryChange
}: ArticleEditorProps): JSX.Element {
  const port = useDataPort()
  const { allStories, upsertArticle } = useLibrary()
  const dispatch = useWorkspaceDispatch()
  const navigate = useWorkspaceNavigation()
  const creating = stored === null
  const [draft, setDraft] = useState<Article>(stored ?? emptyArticle(initialStoryId))
  const [view, setView] = useState<EditorView | null>(null)

  const canPersist = (value: Article): boolean =>
    value.StoryID.trim() !== '' && value.Title.trim() !== ''

  const { status, error, schedule, saveNow } = useDraftPersistence<Article>({
    initialStatus: creating ? 'incomplete' : 'saved',
    canPersist,
    create: (value) =>
      port.createArticle({
        storyId: value.StoryID,
        title: value.Title,
        subtitle: value.Subtitle,
        target: value.Target,
        text: value.Text
      }),
    update: (value) => port.updateArticle(value),
    onStored: (value, wasCreated) => {
      upsertArticle(value)
      publishUnsavedDraft(false)

      if (wasCreated) {
        setDraft(value)
        dispatch({ type: 'create/cancel' })
        navigate({ type: 'article/select', articleId: value.ID })
      }
    }
  })

  const { publishCursor } = useEditorStatus({ text: draft.Text, status })

  useEffect(() => {
    registerSave(saveNow)

    return () => registerSave(null)
  }, [saveNow])

  const change = (next: Article): void => {
    setDraft(next)
    // What cannot be persisted, and would be lost by leaving, is what the
    // navigation guard must ask about — a blanked title included.
    publishUnsavedDraft(hasContent(next) && !canPersist(next))
    schedule(next)
  }

  return (
    <section
      aria-label="Article editor"
      className="flex min-h-0 min-w-0 flex-1 flex-col bg-base-100"
    >
      <ArticleBand
        stories={allStories}
        storyId={draft.StoryID}
        title={draft.Title}
        subtitle={draft.Subtitle}
        target={draft.Target}
        creating={creating}
        onStory={(storyId) => {
          change({ ...draft, StoryID: storyId })
          if (creating) {
            onStoryChange?.(storyId)
          }
        }}
        onTitle={(title) => change({ ...draft, Title: title })}
        onSubtitle={(subtitle) => change({ ...draft, Subtitle: subtitle })}
        onTarget={(target) => change({ ...draft, Target: target })}
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
      />

      {status === 'error' ? <EditorError message={error} onRetry={() => void saveNow()} /> : null}
    </section>
  )
}
