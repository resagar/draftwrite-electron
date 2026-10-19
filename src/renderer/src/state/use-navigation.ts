import { useCallback } from 'react'
import { hasUnsavedDraft } from './status-store'
import { useWorkspaceDispatch, type WorkspaceAction } from './workspace-context'

// Every navigation goes through here. If the editor holds changes that are not
// persisted yet, the move waits in the state so the writer can confirm before
// losing them.
export function useWorkspaceNavigation(): (action: WorkspaceAction) => void {
  const dispatch = useWorkspaceDispatch()

  return useCallback(
    (action: WorkspaceAction) => {
      if (hasUnsavedDraft()) {
        dispatch({ type: 'pending/set', action })
        return
      }

      dispatch(action)
    },
    [dispatch]
  )
}
