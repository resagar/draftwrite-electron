import { useCallback } from 'react'
import { CREATE_LABELS } from '../lib/create-labels'
import { useStoryInContext } from './use-story-in-context'
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
  const { library } = useWorkspace()
  const { story, hasStories } = useStoryInContext()
  const navigate = useWorkspaceNavigation()

  const kind: CreateKind = library === 'stories' ? 'story' : 'article'
  const label = CREATE_LABELS[kind]

  // An Article is born from a Story, so there is nothing to create until one exists.
  const disabled = kind === 'article' && !hasStories

  const start = useCallback((): void => {
    if (disabled) {
      return
    }

    navigate(
      kind === 'story'
        ? { type: 'create/start', kind: 'story' }
        : { type: 'create/start', kind: 'article', storyId: story?.ID }
    )
  }, [story?.ID, disabled, kind, navigate])

  return { kind, label, disabled, start }
}
