/* eslint-disable react-refresh/only-export-components -- the state, its reducer, the provider and the hooks are one module */
import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type JSX,
  type ReactNode
} from 'react'
import type { SortDirection } from '../data/library'

export type Library = 'stories' | 'articles'

export type ViewMode = 'edit' | 'split' | 'preview'

export type CreateKind = 'story' | 'article'

export type DialogKind = 'delete-story' | 'delete-article'

export type WorkspaceState = {
  library: Library
  selectedStoryId: string | null
  selectedArticleId: string | null
  tagFilter: string | null
  sortDirection: SortDirection
  viewMode: ViewMode
  sidebarCollapsed: boolean
  storyPaneVisible: boolean
  creating: CreateKind | null
  // The Story a new Article is pre-selected with, taken from whatever story is
  // in context when «New Article» is pressed.
  creatingStoryId: string | null
  dialog: DialogKind | null
  dialogStoryId: string | null
  pendingNavigation: WorkspaceAction | null
}

export type WorkspaceAction =
  | { type: 'library/select'; library: Library }
  | { type: 'story/select'; storyId: string | null }
  | { type: 'story/deleted'; storyId: string }
  | { type: 'article/select'; articleId: string | null }
  | { type: 'filter/tag'; tag: string | null }
  | { type: 'sort/toggle' }
  | { type: 'viewMode/select'; viewMode: ViewMode }
  | { type: 'sidebar/toggle' }
  | { type: 'storyPane/toggle' }
  | { type: 'create/start'; kind: CreateKind; storyId?: string }
  | { type: 'create/cancel' }
  | { type: 'dialog/open'; dialog: DialogKind; storyId?: string }
  | { type: 'dialog/close' }
  | { type: 'pending/set'; action: WorkspaceAction }
  | { type: 'pending/clear' }

export const initialWorkspaceState: WorkspaceState = {
  library: 'stories',
  selectedStoryId: null,
  selectedArticleId: null,
  tagFilter: null,
  sortDirection: 'desc',
  viewMode: 'split',
  sidebarCollapsed: false,
  storyPaneVisible: false,
  creating: null,
  creatingStoryId: null,
  dialog: null,
  dialogStoryId: null,
  pendingNavigation: null
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'library/select':
      return { ...state, library: action.library, creating: null, creatingStoryId: null }
    case 'story/select':
      // One editor per selection: opening a Story leaves the Article behind.
      return {
        ...state,
        selectedStoryId: action.storyId,
        selectedArticleId: null,
        creating: null,
        creatingStoryId: null
      }
    case 'story/deleted':
      return state.selectedStoryId === action.storyId ? { ...state, selectedStoryId: null } : state
    case 'article/select':
      return {
        ...state,
        selectedArticleId: action.articleId,
        creating: null,
        creatingStoryId: null
      }
    case 'filter/tag':
      return { ...state, tagFilter: action.tag }
    case 'sort/toggle':
      return { ...state, sortDirection: state.sortDirection === 'desc' ? 'asc' : 'desc' }
    case 'viewMode/select':
      return { ...state, viewMode: action.viewMode }
    case 'sidebar/toggle':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed }
    case 'storyPane/toggle':
      return { ...state, storyPaneVisible: !state.storyPaneVisible }
    case 'create/start':
      return { ...state, creating: action.kind, creatingStoryId: action.storyId ?? null }
    case 'create/cancel':
      return { ...state, creating: null, creatingStoryId: null }
    case 'dialog/open':
      return { ...state, dialog: action.dialog, dialogStoryId: action.storyId ?? null }
    case 'dialog/close':
      return { ...state, dialog: null, dialogStoryId: null }
    case 'pending/set':
      return { ...state, pendingNavigation: action.action }
    case 'pending/clear':
      return { ...state, pendingNavigation: null }
  }
}

const WorkspaceStateContext = createContext<WorkspaceState | null>(null)
const WorkspaceDispatchContext = createContext<Dispatch<WorkspaceAction> | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState)

  return (
    <WorkspaceStateContext.Provider value={state}>
      <WorkspaceDispatchContext.Provider value={dispatch}>
        {children}
      </WorkspaceDispatchContext.Provider>
    </WorkspaceStateContext.Provider>
  )
}

export function useWorkspace(): WorkspaceState {
  const state = useContext(WorkspaceStateContext)
  if (state === null) {
    throw new Error('useWorkspace requires a WorkspaceProvider')
  }
  return state
}

export function useWorkspaceDispatch(): Dispatch<WorkspaceAction> {
  const dispatch = useContext(WorkspaceDispatchContext)
  if (dispatch === null) {
    throw new Error('useWorkspaceDispatch requires a WorkspaceProvider')
  }
  return dispatch
}
