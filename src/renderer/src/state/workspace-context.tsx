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

export type Library = 'stories' | 'articles' | 'posts'

export type ViewMode = 'edit' | 'split' | 'preview'

export type CreateKind = 'story' | 'article' | 'post'

export type DeleteRequest =
  | { kind: 'delete-story'; storyId: string }
  | { kind: 'delete-article'; articleId: string }
  | { kind: 'delete-post'; postId: string }

export type WorkspaceState = {
  library: Library
  selectedStoryId: string | null
  selectedArticleId: string | null
  selectedPostId: string | null
  tagFilter: string | null
  sortDirection: SortDirection
  viewMode: ViewMode
  sidebarCollapsed: boolean
  zenMode: boolean
  storyPaneExpanded: boolean
  creating: CreateKind | null
  editorSession: number
  // The Story a new Article is pre-selected with, taken from whatever story is
  // in context when «New Article» is pressed.
  creatingStoryId: string | null
  dialog: DeleteRequest | null
  pendingNavigation: WorkspaceAction | null
}

export type WorkspaceAction =
  | { type: 'library/select'; library: Library }
  | { type: 'story/select'; storyId: string | null }
  | { type: 'story/deleted'; storyId: string }
  | { type: 'article/select'; articleId: string | null }
  | { type: 'article/deleted'; articleId: string }
  | { type: 'post/select'; postId: string | null }
  | { type: 'post/deleted'; postId: string }
  | { type: 'filter/tag'; tag: string | null }
  | { type: 'sort/toggle' }
  | { type: 'viewMode/select'; viewMode: ViewMode }
  | { type: 'sidebar/toggle' }
  | { type: 'zen/toggle' }
  | { type: 'storyPane/toggle' }
  | { type: 'create/start'; kind: CreateKind; storyId?: string }
  | { type: 'create/story'; storyId: string }
  | { type: 'create/cancel' }
  | { type: 'create/complete'; kind: CreateKind; id: string; session: number }
  | { type: 'dialog/open'; request: DeleteRequest }
  | { type: 'dialog/close' }
  | { type: 'pending/set'; action: WorkspaceAction }
  | { type: 'pending/clear' }

export const initialWorkspaceState: WorkspaceState = {
  library: 'stories',
  selectedStoryId: null,
  selectedArticleId: null,
  selectedPostId: null,
  tagFilter: null,
  sortDirection: 'desc',
  viewMode: 'split',
  sidebarCollapsed: false,
  zenMode: false,
  storyPaneExpanded: true,
  creating: null,
  editorSession: 0,
  creatingStoryId: null,
  dialog: null,
  pendingNavigation: null
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'library/select':
      return {
        ...state,
        library: action.library,
        creating: null,
        creatingStoryId: null,
        editorSession: state.editorSession + (state.creating === null ? 0 : 1)
      }
    case 'story/select':
      if (
        state.creating === null &&
        state.selectedStoryId === action.storyId &&
        state.selectedArticleId === null &&
        state.selectedPostId === null
      )
        return state
      // One editor per selection: opening a Story leaves the Article behind.
      return {
        ...state,
        editorSession: state.editorSession + 1,
        selectedStoryId: action.storyId,
        selectedArticleId: null,
        selectedPostId: null,
        creating: null,
        creatingStoryId: null
      }
    case 'story/deleted':
      return state.selectedStoryId === action.storyId ? { ...state, selectedStoryId: null } : state
    case 'article/select':
      if (
        state.creating === null &&
        state.selectedArticleId === action.articleId &&
        state.selectedPostId === null
      )
        return state
      return {
        ...state,
        editorSession: state.editorSession + 1,
        selectedArticleId: action.articleId,
        selectedPostId: null,
        creating: null,
        creatingStoryId: null
      }
    case 'article/deleted':
      // Deleting an Article must not cancel an unrelated draft in progress.
      return state.selectedArticleId === action.articleId
        ? { ...state, selectedArticleId: null }
        : state
    case 'post/select':
      if (
        state.creating === null &&
        state.selectedPostId === action.postId &&
        state.selectedStoryId === null &&
        state.selectedArticleId === null
      )
        return state
      return {
        ...state,
        editorSession: state.editorSession + 1,
        selectedPostId: action.postId,
        selectedStoryId: null,
        selectedArticleId: null,
        creating: null,
        creatingStoryId: null
      }
    case 'post/deleted':
      return state.selectedPostId === action.postId ? { ...state, selectedPostId: null } : state
    case 'filter/tag':
      return { ...state, tagFilter: action.tag }
    case 'sort/toggle':
      return { ...state, sortDirection: state.sortDirection === 'desc' ? 'asc' : 'desc' }
    case 'viewMode/select':
      return { ...state, viewMode: action.viewMode }
    case 'sidebar/toggle':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed }
    case 'zen/toggle':
      return { ...state, zenMode: !state.zenMode }
    case 'storyPane/toggle':
      return { ...state, storyPaneExpanded: !state.storyPaneExpanded }
    case 'create/start':
      return {
        ...state,
        editorSession: state.editorSession + 1,
        creating: action.kind,
        creatingStoryId: action.storyId ?? null,
        storyPaneExpanded: action.kind === 'article' ? true : state.storyPaneExpanded
      }
    case 'create/story':
      return { ...state, creatingStoryId: action.storyId }
    case 'create/cancel':
      return {
        ...state,
        creating: null,
        creatingStoryId: null,
        editorSession: state.editorSession + 1
      }
    case 'create/complete':
      // A late save must not replace a different editing session.
      if (state.editorSession !== action.session || state.creating !== action.kind) return state
      return {
        ...state,
        creating: null,
        creatingStoryId: null,
        selectedStoryId:
          action.kind === 'story'
            ? action.id
            : action.kind === 'post'
              ? null
              : state.selectedStoryId,
        selectedArticleId: action.kind === 'article' ? action.id : null,
        selectedPostId: action.kind === 'post' ? action.id : null
      }
    case 'dialog/open':
      return { ...state, dialog: action.request }
    case 'dialog/close':
      return { ...state, dialog: null }
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
