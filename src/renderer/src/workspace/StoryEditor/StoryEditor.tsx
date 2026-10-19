import type { EditorView } from '@codemirror/view'
import { useEffect, useState, type JSX } from 'react'
import { emptyStory } from '../../data/drafts'
import { useDataPort } from '../../data/port-context'
import type { Story } from '../../data/types'
import { TextEditor } from '../../editor/TextEditor/TextEditor'
import { useLibrary } from '../../state/library-context'
import { registerSave } from '../../state/save-registry'
import { publishUnsavedDraft } from '../../state/status-store'
import { useDraftPersistence } from '../../state/use-draft-persistence'
import { useEditorStatus } from '../../state/use-editor-status'
import { useWorkspaceNavigation } from '../../state/use-navigation'
import { useWorkspaceDispatch } from '../../state/workspace-context'
import { EditorError } from '../../ui/EditorError/EditorError'
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
  const { upsertStory } = useLibrary()
  const dispatch = useWorkspaceDispatch()
  const navigate = useWorkspaceNavigation()
  const creating = stored === null
  const [draft, setDraft] = useState<Story>(stored ?? emptyStory())
  const [view, setView] = useState<EditorView | null>(null)

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
      publishUnsavedDraft(false)

      if (wasCreated) {
        setDraft(value)
        dispatch({ type: 'create/cancel' })
        navigate({ type: 'story/select', storyId: value.ID })
      }
    }
  })

  const { publishCursor } = useEditorStatus({ text: draft.Text, status })

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
    <section aria-label="Story editor" className="flex min-w-0 flex-1 flex-col bg-base-100">
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

      <EditorToolbar view={view} />

      <div className="min-h-0 flex-1">
        <TextEditor
          value={draft.Text}
          onChange={(text) => change({ ...draft, Text: text })}
          onCursorChange={publishCursor}
          onCreate={setView}
        />
      </div>

      {status === 'error' ? <EditorError message={error} onRetry={() => void saveNow()} /> : null}
    </section>
  )
}
