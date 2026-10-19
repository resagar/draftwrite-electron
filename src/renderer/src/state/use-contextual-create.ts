import { useCallback } from 'react'
import { useLibrary } from './library-context'
import { useWorkspaceNavigation } from './use-navigation'
import { useWorkspace, type CreateKind } from './workspace-context'

export type ContextualCreate = {
  kind: CreateKind
  label: string
  disabled: boolean
  start: () => void
}

// What the active library offers to create: a Story while Stories is open, an
// Article — pre-selected with the Story in context — while Articles is. The
// sidebar button and the global shortcut read the same derivation.
export function useContextualCreate(): ContextualCreate {
  const { library, selectedArticleId, selectedStoryId } = useWorkspace()
  const { articleById, storiesTotal, storyById } = useLibrary()
  const navigate = useWorkspaceNavigation()

  const kind: CreateKind = library === 'stories' ? 'story' : 'article'
  const label = kind === 'story' ? 'New Story' : 'New Article'

  // The Story the writer is working on: the open one, or the source of the open
  // article. It replicates the precedence the article list already uses.
  const contextStory =
    selectedArticleId === null
      ? storyById(selectedStoryId)
      : storyById(articleById(selectedArticleId)?.StoryID ?? null)

  // An Article is born from a Story, so there is nothing to create until one exists.
  const disabled = kind === 'article' && storiesTotal === 0

  const start = useCallback((): void => {
    if (disabled) {
      return
    }

    navigate(
      kind === 'story'
        ? { type: 'create/start', kind: 'story' }
        : { type: 'create/start', kind: 'article', storyId: contextStory?.ID }
    )
  }, [contextStory?.ID, disabled, kind, navigate])

  return { kind, label, disabled, start }
}
