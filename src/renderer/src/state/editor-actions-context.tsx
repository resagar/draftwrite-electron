/* eslint-disable react-refresh/only-export-components -- the provider and the hooks that read it belong together */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode
} from 'react'
import type { DeleteRequest } from './workspace-context'

/**
 * Actions an open editor publishes to the title bar.
 *
 * `null` means "no editor is mounted": the title bar hides the view mode
 * switcher and the editor actions. `deleteRequest` is null while the document
 * is still a draft, and `versions` is null when the capability is unavailable
 * or the editorial workspace is open.
 */
export type EditorActionSet = {
  deleteRequest: DeleteRequest | null
  versions: { disabled: boolean; open: () => void } | null
}

type EditorActionsContextValue = {
  actions: EditorActionSet | null
  publish: (next: EditorActionSet | null) => void
}

const EditorActionsContext = createContext<EditorActionsContextValue | null>(null)

export function EditorActionsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [actions, setActions] = useState<EditorActionSet | null>(null)
  const publish = useCallback((next: EditorActionSet | null) => setActions(next), [])
  const value = useMemo(() => ({ actions, publish }), [actions, publish])

  return <EditorActionsContext.Provider value={value}>{children}</EditorActionsContext.Provider>
}

export function useEditorActions(): EditorActionSet | null {
  const value = useContext(EditorActionsContext)

  if (value === null) {
    throw new Error('useEditorActions requires an EditorActionsProvider')
  }

  return value.actions
}

export function usePublishEditorActions(actions: EditorActionSet | null): void {
  const value = useContext(EditorActionsContext)

  if (value === null) {
    throw new Error('usePublishEditorActions requires an EditorActionsProvider')
  }

  const { publish } = value

  useEffect(() => {
    publish(actions)

    return () => publish(null)
  }, [publish, actions])
}
