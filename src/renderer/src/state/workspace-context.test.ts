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
