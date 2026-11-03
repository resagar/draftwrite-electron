import { describe, expect, it } from '@jest/globals'
import { initialWorkspaceState, workspaceReducer } from './workspace-context'

describe('zen mode', () => {
  it('toggles without disturbing the sidebar rail or the source story pane', () => {
    const state = { ...initialWorkspaceState, sidebarCollapsed: true, storyPaneExpanded: false }

    const on = workspaceReducer(state, { type: 'zen/toggle' })

    expect(on.zenMode).toBe(true)
    expect(on.sidebarCollapsed).toBe(true)
    expect(on.storyPaneExpanded).toBe(false)

    expect(workspaceReducer(on, { type: 'zen/toggle' }).zenMode).toBe(false)
  })
})

describe('opening an entry from the quick switcher', () => {
  it('switches to the matching library and clears the other selections', () => {
    const state = {
      ...initialWorkspaceState,
      library: 'stories' as const,
      selectedStoryId: 's1',
      selectedArticleId: 'a1'
    }

    const next = workspaceReducer(state, {
      type: 'entry/open',
      kind: 'post',
      id: 'p1',
      clearTagFilter: false
    })

    expect(next.library).toBe('posts')
    expect(next.selectedPostId).toBe('p1')
    expect(next.selectedStoryId).toBeNull()
    expect(next.selectedArticleId).toBeNull()
    expect(next.editorSession).toBe(state.editorSession + 1)
  })

  it('cancels a creation in progress', () => {
    const state = {
      ...initialWorkspaceState,
      creating: 'story' as const,
      creatingStoryId: 's1'
    }

    const next = workspaceReducer(state, {
      type: 'entry/open',
      kind: 'article',
      id: 'a1',
      clearTagFilter: false
    })

    expect(next.creating).toBeNull()
    expect(next.creatingStoryId).toBeNull()
    expect(next.library).toBe('articles')
    expect(next.selectedArticleId).toBe('a1')
  })

  it('clears the tag filter only when it would hide the entry', () => {
    const state = { ...initialWorkspaceState, tagFilter: 'music' }

    const kept = workspaceReducer(state, {
      type: 'entry/open',
      kind: 'story',
      id: 's1',
      clearTagFilter: false
    })
    expect(kept.tagFilter).toBe('music')

    const cleared = workspaceReducer(state, {
      type: 'entry/open',
      kind: 'story',
      id: 's2',
      clearTagFilter: true
    })
    expect(cleared.tagFilter).toBeNull()
  })
})
