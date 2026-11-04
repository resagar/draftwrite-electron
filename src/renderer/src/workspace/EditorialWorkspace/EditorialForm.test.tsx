import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it } from '@jest/globals'
import type { EditorialWorkspace, EditorialAction, Writing } from '../../../../shared/editorial'
import { EditorialForm } from './EditorialForm'

it('branches from an identical current draft without creating a duplicate version', async () => {
  const content: Writing = { kind: 'post', topic: 'A complete Post', text: 'A complete draft' }
  const workspace: EditorialWorkspace = {
    kind: 'post',
    pieceId: 'p1',
    revision: 1,
    primaryId: 'main',
    variants: [
      {
        id: 'main',
        name: 'Main',
        number: '1.0.0',
        archived: false,
        baseId: null,
        headId: 'v1',
        content,
        initialContent: content,
        notes: [],
        pendingIntegrations: []
      }
    ],
    versions: [
      {
        id: 'v1',
        variantId: 'main',
        number: '1.0.0',
        description: 'Completed draft',
        createdAt: '2026-11-04T00:00:00Z',
        parentId: null,
        integratedFrom: [],
        content,
        notes: []
      }
    ],
    publications: [],
    origin: null,
    conversions: []
  }
  const actions: EditorialAction[] = []
  let closed = false
  render(
    <EditorialForm
      type="branch"
      workspace={workspace}
      variant={workspace.variants[0]}
      onClose={() => {
        closed = true
      }}
      execute={async (action) => {
        actions.push(action)
        if (action.type === 'version') throw new Error('Duplicate version is not allowed')
        return { workspace }
      }}
    />
  )
  fireEvent.change(screen.getByLabelText('Variant name'), {
    target: { value: 'Alternate opening' }
  })
  fireEvent.change(screen.getByLabelText('Start from'), { target: { value: 'draft' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create variant' }))
  await waitFor(() => expect(closed).toBe(true))
  expect(actions).toEqual([
    { type: 'read' },
    { type: 'branch', variantId: 'main', versionId: 'v1', name: 'Alternate opening' }
  ])
})
