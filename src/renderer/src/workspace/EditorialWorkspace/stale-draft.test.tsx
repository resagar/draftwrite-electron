import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { expect, it } from '@jest/globals'
import { renderApp } from '../../test/render-app'
import { createFakePort } from '../../data/fake/fake-port'
import { makePost } from '../../data/fake/factories'
import { IpcError } from '../../data/ipc-port'
import type { EditorialWorkspace, EditorialVariant, Writing } from '../../../../shared/editorial'

it('preserves newer stored work as a manual version before retrying a local stale draft', async () => {
  const original: Writing = { kind: 'post', topic: 'Original post', text: 'Original writing' }
  let workspace: EditorialWorkspace = {
    kind: 'post',
    pieceId: 'p1',
    revision: 0,
    primaryId: 'main',
    variants: [
      {
        id: 'main',
        name: 'Main',
        number: '1.0.0',
        archived: false,
        headId: 'v1',
        baseId: null,
        content: original,
        initialContent: original,
        notes: [],
        pendingIntegrations: []
      }
    ],
    versions: [
      {
        id: 'v1',
        variantId: 'main',
        number: '1.0.0',
        description: 'Original version',
        createdAt: '2026-01-01T00:00:00Z',
        parentId: null,
        integratedFrom: [],
        content: original,
        notes: []
      }
    ],
    publications: [],
    origin: null,
    conversions: []
  }
  let rejected = false
  const fake = createFakePort({
    posts: [makePost({ ID: 'p1', Topic: 'Original post', Text: 'Original writing' })],
    editorial: async (request) => {
      const action = request.action
      if (action.type === 'draft' && !rejected) {
        rejected = true
        workspace = {
          ...workspace,
          revision: 1,
          variants: [
            {
              ...workspace.variants[0],
              content: {
                kind: 'post',
                topic: 'Newer stored draft',
                text: 'Do not lose this writing'
              }
            }
          ]
        }
        throw new IpcError('errEditorialStale', 'Newer stored draft detected')
      }
      if (action.type === 'version') {
        workspace.versions.push({
          id: 'v2',
          variantId: 'main',
          number: '1.1.0',
          description: action.description,
          createdAt: '2026-11-04T00:00:00Z',
          parentId: 'v1',
          integratedFrom: [],
          content: { ...workspace.variants[0].content },
          notes: []
        })
        workspace.variants[0] = { ...workspace.variants[0], headId: 'v2', number: '1.1.0' }
        workspace.revision++
      }
      if (action.type === 'draft') {
        workspace.variants[0] = { ...workspace.variants[0], content: action.content }
        workspace.revision++
      }
      return { workspace: JSON.parse(JSON.stringify(workspace)) as EditorialWorkspace }
    }
  })
  renderApp(fake.port)
  await screen.findByRole('button', { name: 'Posts' })
  fireEvent.click(screen.getByRole('button', { name: 'Posts' }))
  fireEvent.click(await screen.findByRole('option', { name: /Original post/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Versions and review' }))
  await screen.findByRole('button', { name: 'Save version' })
  fireEvent.change(screen.getByRole('textbox', { name: 'Topic' }), {
    target: { value: 'My local revision' }
  })
  await screen.findByText('Newer stored draft detected', {}, { timeout: 3000 })
  fireEvent.click(screen.getByRole('button', { name: 'Review newer stored drafts' }))
  await screen.findByRole('dialog', { name: 'Resolve newer stored drafts' })
  expect(workspace.variants[0].content).toMatchObject({ topic: 'Newer stored draft' })
  fireEvent.change(screen.getByLabelText('Preservation description'), {
    target: { value: 'Preserve newer stored work' }
  })
  fireEvent.click(screen.getByRole('button', { name: 'Preserve stored work and apply my drafts' }))
  await waitFor(() =>
    expect(workspace.variants[0].content).toMatchObject({ topic: 'My local revision' })
  )
  expect(workspace.versions[1]).toMatchObject({
    description: 'Preserve newer stored work',
    content: { topic: 'Newer stored draft', text: 'Do not lose this writing' }
  })
})

it('removes applied variants from recovery when saving a second variant fails', async () => {
  const content: Writing = { kind: 'post', topic: 'Original post', text: 'Original writing' }
  const variant = (id: string, name: string): EditorialVariant => ({
    id,
    name,
    number: '1.0.0',
    archived: false,
    headId: 'v-' + id,
    baseId: null,
    content: { ...content },
    initialContent: content,
    notes: [],
    pendingIntegrations: []
  })
  const workspace: EditorialWorkspace = {
    kind: 'post',
    pieceId: 'p1',
    revision: 0,
    primaryId: 'main',
    variants: [variant('main', 'Main'), variant('alternate', 'Alternate')],
    versions: ['main', 'alternate'].map((id) => ({
      id: 'v-' + id,
      variantId: id,
      number: '1.0.0',
      description: 'Original',
      createdAt: '2026-01-01T00:00:00Z',
      parentId: null,
      integratedFrom: [],
      content: { ...content },
      notes: []
    })),
    publications: [],
    origin: null,
    conversions: []
  }
  let rejected = false
  let failSecond = true
  const fake = createFakePort({
    posts: [makePost({ ID: 'p1', Topic: 'Original post', Text: 'Original writing' })],
    editorial: async (request) => {
      const action = request.action
      if (action.type === 'draft' && !rejected) {
        rejected = true
        workspace.variants[0].content = {
          kind: 'post',
          topic: 'Stored main',
          text: 'Stored main writing'
        }
        workspace.variants[1].content = {
          kind: 'post',
          topic: 'Stored alternate',
          text: 'Stored alternate writing'
        }
        workspace.revision++
        throw new IpcError('errEditorialStale', 'Newer stored drafts detected')
      }
      if (action.type === 'version') {
        const target = workspace.variants.find((v) => v.id === action.variantId)!
        workspace.versions.push({
          id: 'preserved-' + target.id,
          variantId: target.id,
          number: '1.1.0',
          description: action.description,
          createdAt: '2026-11-04T00:00:00Z',
          parentId: target.headId,
          integratedFrom: [],
          content: { ...target.content },
          notes: []
        })
        target.headId = 'preserved-' + target.id
        target.number = '1.1.0'
        workspace.revision++
      }
      if (action.type === 'draft') {
        if (action.variantId === 'alternate' && failSecond) {
          failSecond = false
          throw new Error('Disk full')
        }
        workspace.variants.find((v) => v.id === action.variantId)!.content = action.content
        workspace.revision++
      }
      return { workspace: JSON.parse(JSON.stringify(workspace)) as EditorialWorkspace }
    }
  })
  renderApp(fake.port)
  fireEvent.click(await screen.findByRole('button', { name: 'Posts' }))
  fireEvent.click(await screen.findByRole('option', { name: /Original post/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Versions and review' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Parallel' }))
  await screen.findByRole('region', { name: 'Alternate draft' })
  fireEvent.change(
    within(screen.getByRole('region', { name: 'Main draft' })).getByRole('textbox', {
      name: 'Topic'
    }),
    { target: { value: 'Local main' } }
  )
  fireEvent.change(
    within(screen.getByRole('region', { name: 'Alternate draft' })).getByRole('textbox', {
      name: 'Topic'
    }),
    { target: { value: 'Local alternate' } }
  )
  await screen.findByText('Newer stored drafts detected', {}, { timeout: 3000 })
  fireEvent.click(screen.getByRole('button', { name: 'Review newer stored drafts' }))
  const recovery = await screen.findByRole('dialog', { name: 'Resolve newer stored drafts' })
  fireEvent.change(screen.getByLabelText('Preservation description'), {
    target: { value: 'Preserve concurrent work' }
  })
  fireEvent.click(screen.getByRole('button', { name: 'Preserve stored work and apply my drafts' }))
  await within(recovery).findByText(/1 draft.*already applied/)
  expect(screen.getByText('Variant: Alternate')).toBeTruthy()
  expect(within(recovery).queryByText('Main', { exact: true })).toBeNull()
  expect(within(recovery).getByText('Alternate', { exact: true })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Discard my pending drafts and use stored' }))
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Resolve newer stored drafts' })).toBeNull()
  )
  expect(workspace.variants[0].content).toMatchObject({ topic: 'Local main' })
  expect(workspace.variants[1].content).toMatchObject({ topic: 'Stored alternate' })
})
