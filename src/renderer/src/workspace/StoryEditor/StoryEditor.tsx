import { useTagMutations } from '../../state/tag-mutation-context'
import type { EditorView } from '@codemirror/view'
import { useEffect, useMemo, useState, type JSX } from 'react'
import { emptyStory } from '../../data/drafts'
import { useDataPort } from '../../data/port-context'
import type { Story } from '../../data/types'
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
import { EditorToolbar } from '../EditorToolbar/EditorToolbar'
import { StoryBand } from '../StoryBand/StoryBand'

type StoryEditorProps = {
  stored: Story | null
}

function hasContent(story: Story): boolean {
  return (
    story.Topic.trim() !== '' ||
    story.Text.trim() !== '' ||
    story.Titles.some((title) => title.trim() !== '') ||
    story.Tags.length > 0
  )
}

export function StoryEditor({ stored }: StoryEditorProps): JSX.Element {
  const port = useDataPort()
  const mutations = useTagMutations()
  const { upsertStory } = useLibrary()
  const dispatch = useWorkspaceDispatch()
  const { editorSession } = useWorkspace()
  const creating = stored === null
  const [draft, setDraft] = useState<Story>(stored ?? emptyStory())
  const [view, setView] = useState<EditorView | null>(null)
  useEffect(
    () =>
      mutations.subscribe((name) => {
        setDraft((current) => ({ ...current, Tags: current.Tags.filter((tag) => tag !== name) }))
      }),
    [mutations]
  )

  const canPersist = (value: Story): boolean => value.Topic.trim() !== ''

  const { status, error, schedule, saveNow } = useDraftPersistence<Story>({
    initialStatus: creating ? 'incomplete' : 'saved',
    canPersist,
    create: (value) =>
      port.createStory({
        topic: value.Topic,
        titles: value.Titles,
        tags: value.Tags,
        text: value.Text
      }),
    update: (value) => port.updateStory(value),
    onStored: (value, wasCreated) => {
      upsertStory(value)

      if (wasCreated) {
        setDraft((current) => ({
          ...current,
          ID: value.ID,
          CreatedAt: value.CreatedAt,
          UpdatedAt: value.UpdatedAt
        }))
        dispatch({ type: 'create/complete', kind: 'story', id: value.ID, session: editorSession })
      }
    }
  })

  const { publishCursor } = useEditorStatus({ text: draft.Text, status })

  const editorActions = useMemo<EditorActionSet>(
    () => ({
      deleteRequest: stored === null ? null : { kind: 'delete-story', storyId: stored.ID },
      versions: null
    }),
    [stored]
  )

  usePublishEditorActions(editorActions)

  useEffect(() => {
    registerSave(saveNow)

    return () => registerSave(null)
  }, [saveNow])

  const change = (next: Story): void => {
    setDraft(next)
    // What cannot be persisted, and would be lost by leaving, is what the
    // navigation guard must ask about — a blanked topic included.
    publishUnsavedDraft(hasContent(next) && !canPersist(next))
    schedule(next)
  }

  return (
    <section aria-label="Story editor" className="flex min-h-0 min-w-0 flex-1 flex-col bg-base-100">
      <StoryBand
        topic={draft.Topic}
        titles={draft.Titles}
        tags={draft.Tags}
        creating={creating}
        onTopic={(topic) => change({ ...draft, Topic: topic })}
        onTitles={(titles) => change({ ...draft, Titles: titles })}
        onTags={(tags) => change({ ...draft, Tags: tags })}
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
  )
}
