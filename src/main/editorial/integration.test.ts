import { afterEach, describe, expect, it } from '@jest/globals'
import { bootstrap, closeDatabase, type Bootstrap } from '../bootstrap'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { registerIpcHandlers } from '../adapters/ipc/register'
import type { EditorialReply, EditorialRequest } from '../../shared/editorial'

const fixtures: { app: Bootstrap; path: string }[] = []
type Handler = (event: unknown, ...args: unknown[]) => unknown

function fixture(): { app: Bootstrap; call: (payload: unknown) => Promise<unknown> } {
  const path = mkdtempSync(join(tmpdir(), 'draftwrite-editorial-'))
  const app = bootstrap({ platform: 'linux', env: { XDG_DATA_HOME: path } })
  fixtures.push({ app, path })
  const handlers = new Map<string, Handler>()
  registerIpcHandlers(
    {
      handle: (channel, handler) => {
        handlers.set(channel, handler)
      }
    },
    app.services
  )
  return {
    app,
    call: async (payload) => {
      const handler = handlers.get('editorial:execute')
      if (!handler) throw new Error('Editorial IPC handler is missing')
      return handler({}, payload)
    }
  }
}

afterEach(() => {
  for (const { app, path } of fixtures.splice(0)) {
    closeDatabase(app.db)
    rmSync(path, { recursive: true, force: true })
  }
})

describe('editorial workflow through IPC and real SQLite', () => {
  it('rejects carrying a note on retained text when the selected source change only deletes another paragraph', async () => {
    const f = await workflow()
    const variantId = f.workspace().primaryId
    await f.run({ type: 'version', variantId, increment: 'minor', description: 'Base' })
    await f.run({
      type: 'branch',
      variantId,
      versionId: f.workspace().versions[0].id,
      name: 'Delete opening'
    })
    const sourceVariant = f.workspace().variants[1].id
    await f.run({
      type: 'draft',
      variantId: sourceVariant,
      content: { kind: 'post', topic: 'An opening', text: 'Second paragraph.' }
    })
    await f.run({
      type: 'note',
      variantId: sourceVariant,
      noteId: null,
      text: 'Review retained paragraph',
      anchor: { from: 0, to: 17 }
    })
    await f.run({
      type: 'version',
      variantId: sourceVariant,
      increment: 'minor',
      description: 'Remove opening only'
    })
    const sourceId = f.workspace().variants[1].headId
    const plan = (await f.run({ type: 'plan', variantId, sourceId })).plan!
    const selected = plan.chunks.map((c) => c.id)
    await expect(
      f.run({
        type: 'integrate',
        variantId,
        sourceId,
        selected,
        resolutions: {},
        noteIds: [plan.notes[0].id]
      })
    ).rejects.toMatchObject({ code: 'errEditorialInvalid' })
    expect((await f.run({ type: 'read' })).workspace.variants[0].content.text).toBe(
      'First paragraph.\n\nSecond paragraph.'
    )
    await f.run({ type: 'integrate', variantId, sourceId, selected, resolutions: {}, noteIds: [] })
    expect(f.workspace().variants[0].content.text).toBe('Second paragraph.')
    expect(f.workspace().variants[0].notes).toHaveLength(0)
  })

  it('carries a selected related review note with independent identity and resolution', async () => {
    const f = await workflow()
    const variantId = f.workspace().primaryId
    await f.run({ type: 'version', variantId, increment: 'minor', description: 'Base' })
    await f.run({
      type: 'branch',
      variantId,
      versionId: f.workspace().versions[0].id,
      name: 'Narrative'
    })
    const sourceVariant = f.workspace().variants[1].id
    await f.run({
      type: 'draft',
      variantId: sourceVariant,
      content: {
        kind: 'post',
        topic: 'An opening',
        text: 'Narrative paragraph.\n\nSecond paragraph.'
      }
    })
    await f.run({
      type: 'note',
      variantId: sourceVariant,
      noteId: null,
      text: 'Check narrative word choice',
      anchor: { from: 0, to: 9 }
    })
    await f.run({
      type: 'version',
      variantId: sourceVariant,
      increment: 'minor',
      description: 'Narrative opening'
    })
    const sourceId = f.workspace().variants[1].headId
    const plan = (await f.run({ type: 'plan', variantId, sourceId })).plan!
    await f.run({
      type: 'integrate',
      variantId,
      sourceId,
      selected: plan.chunks.map((c) => c.id),
      resolutions: {},
      noteIds: [plan.notes[0].id]
    })
    const note = f.workspace().variants[0].notes[0]
    expect(note).toMatchObject({
      text: 'Check narrative word choice',
      origin: { pieceId: f.id, variantId: sourceVariant, noteId: plan.notes[0].id },
      anchor: { from: 0, to: 9, detached: false }
    })
    expect(note.id).not.toBe(plan.notes[0].id)
    await f.run({ type: 'resolveNote', variantId, noteId: note.id, resolved: true })
    expect(f.workspace().variants[1].notes[0].resolved).toBe(false)
  })
  it('does not silently attach a note to a different occurrence of a repeated paragraph', async () => {
    const f = await workflow()
    const variantId = f.workspace().primaryId
    await f.run({
      type: 'draft',
      variantId,
      content: { kind: 'post', topic: 'An opening', text: 'Repeat.\n\nRepeat.' }
    })
    await f.run({
      type: 'note',
      variantId,
      noteId: null,
      text: 'Review the second occurrence',
      anchor: { from: 9, to: 16, quote: 'Repeat.' }
    })
    await f.run({
      type: 'draft',
      variantId,
      content: { kind: 'post', topic: 'An opening', text: 'Repeat.' }
    })
    expect(f.workspace().variants[0].notes[0].anchor).toMatchObject({
      quote: 'Repeat.',
      detached: true
    })
  })
  it('keeps unselected source changes available after a partial integration is versioned', async () => {
    const f = await workflow()
    const variantId = f.workspace().primaryId
    await f.run({ type: 'version', variantId, increment: 'minor', description: 'Common draft' })
    await f.run({
      type: 'branch',
      variantId,
      versionId: f.workspace().versions[0].id,
      name: 'Two changes'
    })
    const sourceVariant = f.workspace().variants[1].id
    await f.run({
      type: 'draft',
      variantId: sourceVariant,
      content: {
        kind: 'post',
        topic: 'An opening',
        text: 'Narrative paragraph.\n\nBranch paragraph.'
      }
    })
    await f.run({
      type: 'version',
      variantId: sourceVariant,
      increment: 'minor',
      description: 'Two independent changes'
    })
    const sourceId = f.workspace().variants[1].headId
    await f.run({
      type: 'note',
      variantId,
      noteId: null,
      text: 'A destination-only review',
      anchor: null
    })
    await f.run({
      type: 'version',
      variantId,
      increment: 'patch',
      description: 'Destination review'
    })
    const initial = await f.run({ type: 'plan', variantId, sourceId })
    expect(initial.plan!.chunks).toHaveLength(2)
    await f.run({
      type: 'integrate',
      variantId,
      sourceId,
      selected: [initial.plan!.chunks[0].id],
      resolutions: {},
      noteIds: []
    })
    await f.run({ type: 'version', variantId, increment: 'patch', description: 'Only the opening' })
    const remaining = await f.run({ type: 'plan', variantId, sourceId })
    expect(remaining.plan!.chunks).toEqual([expect.objectContaining({ source: 'Branch' })])
  })
  it('rejects stale writes and forged cross-piece version references without changing the draft', async () => {
    const f = await workflow()
    const initial = f.workspace()
    const variantId = initial.primaryId
    await f.run({ type: 'version', variantId, increment: 'patch', description: 'First draft' })
    expect(
      await f.raw({
        kind: 'post',
        pieceId: f.id,
        revision: initial.revision,
        action: {
          type: 'draft',
          variantId,
          content: { kind: 'post', topic: 'Overwritten', text: 'Lost work' }
        }
      })
    ).toMatchObject({ ok: false, error: { code: 'errEditorialStale' } })
    await expect(
      f.run({ type: 'restore', variantId, versionId: 'foreign-version' })
    ).rejects.toMatchObject({ code: 'errEditorialNotFound' })
    expect((await f.run({ type: 'read' })).workspace.variants[0].content.text).toBe(
      'First paragraph.\n\nSecond paragraph.'
    )
    expect(
      await f.raw({
        kind: 'post',
        pieceId: f.id,
        revision: f.workspace().revision,
        action: {
          type: 'publish',
          variantId,
          versionId: f.workspace().versions[0].id,
          date: '2026-11-04',
          url: 'javascript:alert(1)'
        }
      })
    ).toMatchObject({ ok: false, error: { code: 'errInvalidPayload' } })
  })

  it('keeps Article uniqueness and rolls back a conflicting conversion before retrying', async () => {
    const { app, call } = fixture()
    const story = await app.services.story.create({
      id: '',
      topic: 'Original source',
      text: '',
      titles: [],
      tags: [],
      createdAt: '',
      updatedAt: ''
    })
    const article = await app.services.article.create({
      tags: [],
      id: '',
      storyID: story.id,
      title: 'Original article',
      subtitle: 'Subtitle',
      target: 'Target',
      text: 'Original writing',
      createdAt: '',
      updatedAt: ''
    })
    let state = (
      (await call({ kind: 'article', pieceId: article.id, action: { type: 'read' } })) as {
        value: EditorialReply
      }
    ).value.workspace
    const run = async (action: unknown): Promise<EditorialReply> => {
      const result = (await call({
        kind: 'article',
        pieceId: article.id,
        revision: state.revision,
        action
      })) as { ok: boolean; value: EditorialReply; error: Error }
      if (!result.ok) throw result.error
      state = result.value.workspace
      return result.value
    }
    await run({
      type: 'version',
      variantId: state.primaryId,
      increment: 'minor',
      description: 'Original draft'
    })
    await run({
      type: 'branch',
      variantId: state.primaryId,
      versionId: state.versions[0].id,
      name: 'Independent exploration'
    })
    const branchId = state.variants[1].id
    await expect(
      run({ type: 'convert', variantId: branchId, title: 'Original article' })
    ).rejects.toMatchObject({ code: 'errTitleTaken' })
    expect((await run({ type: 'read' })).workspace.variants[1].archived).toBe(false)
    expect(await app.services.article.listByStory(story.id)).toHaveLength(1)
    const reply = await run({
      type: 'convert',
      variantId: branchId,
      title: 'An independent article'
    })
    expect(await app.services.article.get(reply.converted!.pieceId)).toMatchObject({
      storyID: story.id,
      title: 'An independent article',
      subtitle: 'Subtitle',
      target: 'Target',
      text: 'Original writing'
    })
    expect(state.variants[1].archived).toBe(true)
  })

  it('reopens persisted versions and review notes through a fresh application instance', async () => {
    const f = await workflow()
    const variantId = f.workspace().primaryId
    await f.run({ type: 'note', variantId, noteId: null, text: 'Keep this review', anchor: null })
    await f.run({ type: 'version', variantId, increment: 'major', description: 'Retained version' })
    const existing = fixtures.at(-1)!
    closeDatabase(existing.app.db)
    existing.app = bootstrap({ platform: 'linux', env: { XDG_DATA_HOME: existing.path } })
    const handlers = new Map<string, Handler>()
    registerIpcHandlers(
      {
        handle: (channel, handler) => {
          handlers.set(channel, handler)
        }
      },
      existing.app.services
    )
    const result = await handlers.get('editorial:execute')!(
      {},
      { kind: 'post', pieceId: f.id, action: { type: 'read' } }
    )
    expect(result).toMatchObject({
      ok: true,
      value: {
        workspace: {
          versions: [
            expect.objectContaining({
              number: '1.0.0',
              description: 'Retained version',
              notes: [expect.objectContaining({ text: 'Keep this review' })]
            })
          ]
        }
      }
    })
  })
  it('preserves the quoted selection if the paragraph changes while a note is being composed', async () => {
    const f = await workflow()
    const variantId = f.workspace().primaryId
    await f.run({
      type: 'draft',
      variantId,
      content: { kind: 'post', topic: 'An opening', text: 'Changed.' }
    })
    await f.run({
      type: 'note',
      variantId,
      noteId: null,
      text: 'Improve this paragraph',
      anchor: { from: 0, to: 16, quote: 'First paragraph.' }
    })
    expect(f.workspace().variants[0].notes[0].anchor).toMatchObject({
      quote: 'First paragraph.',
      detached: true
    })
  })
  async function workflow(): Promise<{
    app: Bootstrap
    run: (action: unknown) => Promise<EditorialReply>
    workspace: () => EditorialReply['workspace']
    raw: (payload: unknown) => Promise<unknown>
    id: string
  }> {
    const { app, call } = fixture()
    const post = await app.services.post.create({
      tags: [],
      id: '',
      state: 'pending',
      scheduledAt: null,
      createdAt: '',
      updatedAt: '',
      topic: 'An opening',
      text: 'First paragraph.\n\nSecond paragraph.',
      storyID: null,
      articleID: null
    })
    let current = (
      (await call({ kind: 'post', pieceId: post.id, action: { type: 'read' } })) as {
        value: EditorialReply
      }
    ).value.workspace
    return {
      app,
      id: post.id,
      raw: call,
      workspace: () => current,
      run: async (action) => {
        const result = (await call({
          kind: 'post',
          pieceId: post.id,
          revision: current.revision,
          action
        })) as { ok: boolean; value: EditorialReply; error: Error }
        if (!result.ok) throw result.error
        current = result.value.workspace
        return result.value
      }
    }
  }
  it('starts an existing Post at 0.0.0 without inventing saved versions', async () => {
    const { app, call } = fixture()
    const post = await app.services.post.create({
      tags: [],
      id: '',
      state: 'pending',
      scheduledAt: null,
      createdAt: '',
      updatedAt: '',
      topic: 'An opening',
      text: 'First draft',
      storyID: null,
      articleID: null
    })
    expect(await call({ kind: 'post', pieceId: post.id, action: { type: 'read' } })).toEqual({
      ok: true,
      value: {
        workspace: expect.objectContaining({
          kind: 'post',
          pieceId: post.id,
          versions: [],
          publications: [],
          variants: [
            expect.objectContaining({
              name: 'Main',
              number: '0.0.0',
              content: { kind: 'post', topic: 'An opening', text: 'First draft' }
            })
          ]
        })
      }
    })
  })
  it('saves explicit versions without changing Post publication data', async () => {
    const { app, call } = fixture()
    const post = await app.services.post.create({
      tags: [],
      id: '',
      state: 'pending',
      scheduledAt: null,
      createdAt: '',
      updatedAt: '',
      topic: 'An opening',
      text: 'First draft',
      storyID: null,
      articleID: null
    })
    await app.services.post.update({
      ...post,
      state: 'scheduled',
      scheduledAt: '2027-01-01T12:00:00.000Z'
    })
    const run = async (
      action: EditorialRequest['action'],
      revision?: number
    ): Promise<EditorialReply> => {
      const result = (await call({ kind: 'post', pieceId: post.id, revision, action })) as {
        ok: boolean
        value: EditorialReply
        error?: unknown
      }
      if (!result.ok) throw result.error
      return result.value
    }
    const { workspace: initial } = await run({ type: 'read' })
    const result = await call({
      kind: 'post',
      pieceId: post.id,
      revision: initial.revision,
      action: {
        type: 'version',
        variantId: initial.primaryId,
        increment: 'major',
        description: 'First complete draft'
      }
    })
    expect(result).toEqual({
      ok: true,
      value: {
        workspace: expect.objectContaining({
          versions: [
            expect.objectContaining({
              number: '1.0.0',
              description: 'First complete draft',
              content: { kind: 'post', topic: 'An opening', text: 'First draft' }
            })
          ]
        })
      }
    })
    expect(await app.services.post.get(post.id)).toMatchObject({
      state: 'scheduled',
      scheduledAt: '2027-01-01T12:00:00.000Z'
    })
  })
  it('versions review-only changes and preserves historical notes when text moves', async () => {
    const f = await workflow()
    const id = f.workspace().primaryId
    await f.run({
      type: 'note',
      variantId: id,
      noteId: null,
      text: 'Improve the opening',
      anchor: { from: 0, to: 16 }
    })
    await f.run({
      type: 'version',
      variantId: id,
      increment: 'minor',
      description: 'Review opening'
    })
    const note = f.workspace().variants[0].notes[0]
    await f.run({ type: 'resolveNote', variantId: id, noteId: note.id, resolved: true })
    await f.run({
      type: 'version',
      variantId: id,
      increment: 'patch',
      description: 'Review complete'
    })
    expect(f.workspace().versions.map((v) => [v.number, v.notes[0].resolved])).toEqual([
      ['0.1.0', false],
      ['0.1.1', true]
    ])
    await expect(
      f.run({ type: 'version', variantId: id, increment: 'patch', description: 'No changes' })
    ).rejects.toMatchObject({ code: 'errEditorialUnchanged' })
    await f.run({
      type: 'draft',
      variantId: id,
      content: { kind: 'post', topic: 'An opening', text: 'An entirely rewritten paragraph.' }
    })
    expect(f.workspace().variants[0].notes[0].anchor).toMatchObject({
      quote: 'First paragraph.',
      detached: true
    })
    expect(f.workspace().versions[0].notes[0].anchor).toMatchObject({ detached: false })
  })
  it('branches from saved versions, protects pending restoration, and archives reversibly', async () => {
    const f = await workflow()
    const main = f.workspace().primaryId
    await f.run({ type: 'note', variantId: main, noteId: null, text: 'Review this', anchor: null })
    await f.run({
      type: 'version',
      variantId: main,
      increment: 'minor',
      description: 'First draft'
    })
    const base = f.workspace().versions[0].id
    await f.run({ type: 'branch', variantId: main, versionId: base, name: 'Narrative' })
    const branch = f.workspace().variants[1]
    expect(branch).toMatchObject({
      number: '0.1.0',
      baseId: base,
      notes: [
        expect.objectContaining({
          resolved: false,
          origin: { pieceId: f.id, variantId: main, noteId: f.workspace().variants[0].notes[0].id }
        })
      ]
    })
    await f.run({
      type: 'draft',
      variantId: branch.id,
      content: { kind: 'post', topic: 'Narrative opening', text: 'A different opening.' }
    })
    await expect(
      f.run({ type: 'restore', variantId: branch.id, versionId: base })
    ).rejects.toMatchObject({ code: 'errEditorialPending' })
    await f.run({
      type: 'version',
      variantId: branch.id,
      increment: 'major',
      description: 'New direction'
    })
    await f.run({ type: 'restore', variantId: branch.id, versionId: base })
    expect(f.workspace().variants[1]).toMatchObject({
      number: '1.0.0',
      content: { text: 'First paragraph.\n\nSecond paragraph.' }
    })
    await f.run({ type: 'primary', variantId: branch.id })
    expect((await f.app.services.post.get(f.id)).topic).toBe('An opening')
    await expect(
      f.run({ type: 'archive', variantId: branch.id, archived: true })
    ).rejects.toMatchObject({ code: 'errEditorialInvalid' })
    await f.run({ type: 'primary', variantId: main })
    await f.run({ type: 'archive', variantId: branch.id, archived: true })
    await f.run({ type: 'archive', variantId: branch.id, archived: false })
    expect(f.workspace().versions).toHaveLength(2)
    expect(f.workspace().variants[1].archived).toBe(false)
  })
  it('records multiple publications of exact versions without changing Post state', async () => {
    const f = await workflow()
    const variantId = f.workspace().primaryId
    await f.run({ type: 'version', variantId, increment: 'major', description: 'First draft' })
    const versionId = f.workspace().versions[0].id
    await f.run({
      type: 'publish',
      variantId,
      versionId,
      date: '2026-11-04',
      url: 'https://example.com/article'
    })
    await f.run({ type: 'publish', variantId, versionId, date: '2026-11-05', url: null })
    expect(f.workspace().publications.map((p) => [p.versionId, p.date])).toEqual([
      [versionId, '2026-11-04'],
      [versionId, '2026-11-05']
    ])
    expect((await f.app.services.post.get(f.id)).state).toBe('pending')
    await expect(
      f.run({ type: 'publish', variantId, versionId, date: 'not-a-date', url: null })
    ).rejects.toMatchObject({ code: 'errInvalidPayload' })
  })
  it.each(['pending', 'scheduled', 'published'] as const)(
    'converts a %s Post variant atomically without copying publication state or sibling variants',
    async (state) => {
      const f = await workflow()
      const main = f.workspace().primaryId
      await f.run({
        type: 'version',
        variantId: main,
        increment: 'major',
        description: 'First draft'
      })
      const base = f.workspace().versions[0].id
      await f.run({
        type: 'publish',
        variantId: main,
        versionId: base,
        date: '2026-11-04',
        url: null
      })
      await f.run({ type: 'branch', variantId: main, versionId: base, name: 'Independent idea' })
      const variantId = f.workspace().variants[1].id
      await f.app.services.post.update({
        ...(await f.app.services.post.get(f.id)),
        state,
        scheduledAt: state === 'scheduled' ? '2027-01-01T12:00:00.000Z' : null
      })
      const reply = await f.run({ type: 'convert', variantId, title: 'A different piece' })
      expect(reply).toMatchObject({ converted: { kind: 'post', pieceId: expect.any(String) } })
      const id = (reply as EditorialReply & { converted: { pieceId: string } }).converted.pieceId
      expect(await f.app.services.post.get(id)).toMatchObject({
        topic: 'A different piece',
        state: 'pending',
        scheduledAt: null
      })
      const result = await f.raw({ kind: 'post', pieceId: id, action: { type: 'read' } })
      expect(result).toMatchObject({
        ok: true,
        value: {
          workspace: {
            variants: [expect.objectContaining({ archived: false, number: '1.0.0' })],
            publications: [],
            origin: { pieceId: f.id, variantId }
          }
        }
      })
      expect(f.workspace().variants[1].archived).toBe(true)
      expect(f.workspace().publications).toHaveLength(1)
    }
  )
  it('integrates selected changes using common ancestry and requires explicit conflict resolution', async () => {
    const f = await workflow()
    const main = f.workspace().primaryId
    await f.run({ type: 'version', variantId: main, increment: 'minor', description: 'Base' })
    await f.run({
      type: 'branch',
      variantId: main,
      versionId: f.workspace().versions[0].id,
      name: 'Narrative'
    })
    const variantId = f.workspace().variants[1].id
    await f.run({
      type: 'draft',
      variantId,
      content: {
        kind: 'post',
        topic: 'An opening',
        text: 'Narrative paragraph.\n\nSecond paragraph.'
      }
    })
    await f.run({
      type: 'version',
      variantId,
      increment: 'minor',
      description: 'Narrative opening'
    })
    const sourceId = f.workspace().variants[1].headId
    await f.run({
      type: 'draft',
      variantId: main,
      content: {
        kind: 'post',
        topic: 'An opening',
        text: 'Technical paragraph.\n\nSecond paragraph.'
      }
    })
    await f.run({
      type: 'version',
      variantId: main,
      increment: 'patch',
      description: 'Technical opening'
    })
    const preview = await f.run({ type: 'plan', variantId: main, sourceId })
    const chunks = (
      preview as EditorialReply & { plan: { chunks: { id: string; conflict: boolean }[] } }
    ).plan.chunks
    expect(chunks).toEqual([expect.objectContaining({ conflict: true })])
    await expect(
      f.run({
        type: 'integrate',
        variantId: main,
        sourceId,
        selected: chunks.map((c) => c.id),
        resolutions: {},
        noteIds: []
      })
    ).rejects.toMatchObject({ code: 'errEditorialConflict' })
    await f.run({
      type: 'integrate',
      variantId: main,
      sourceId,
      selected: chunks.map((c) => c.id),
      resolutions: { [chunks[0].id]: 'Combined' },
      noteIds: []
    })
    expect(f.workspace().variants[0].content.text).toBe('Combined paragraph.\n\nSecond paragraph.')
    expect(f.workspace().versions).toHaveLength(3)
    expect(f.workspace().variants[0].pendingIntegrations).toEqual([sourceId])
  })
})
