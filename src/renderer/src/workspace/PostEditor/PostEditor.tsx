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
import { useWorkspaceDispatch } from '../../state/workspace-context'
import { EditorError } from '../../ui/EditorError/EditorError'
import { EditorPreviewLayout } from '../EditorPreviewLayout/EditorPreviewLayout'
import { EditorToolbar } from '../EditorToolbar/EditorToolbar'
import { PostBand } from '../PostBand/PostBand'

type PostEditorProps = {
  stored: Post | null
}

function hasContent(post: Post): boolean {
  return post.Topic.trim() !== '' || post.Text.trim() !== ''
}

export function PostEditor({ stored }: PostEditorProps): JSX.Element {
  const port = useDataPort()
  const { upsertPost } = useLibrary()
  const dispatch = useWorkspaceDispatch()
  const navigate = useWorkspaceNavigation()
  const creating = stored === null
  const [draft, setDraft] = useState<Post>(stored ?? emptyPost())
  const [view, setView] = useState<EditorView | null>(null)

  const canPersist = (value: Post): boolean => value.Topic.trim() !== ''

  const { status, error, schedule, saveNow } = useDraftPersistence<Post>({
    initialStatus: creating ? 'incomplete' : 'saved',
    canPersist,
    create: (value) => port.createPost({ topic: value.Topic, text: value.Text }),
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
        creating={creating}
        onTopic={(topic) => change({ ...draft, Topic: topic })}
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
