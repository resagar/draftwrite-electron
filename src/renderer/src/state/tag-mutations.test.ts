import { describe, expect, it } from '@jest/globals'
import { TagMutations } from './tag-mutations'

describe('tag mutation ordering', () => {
  it('waits for an in-flight save and strips deleted tags from queued drafts while preserving text', async () => {
    const mutations = new TagMutations()
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const order: string[] = []
    const saving = mutations.run(async () => {
      order.push('save')
      await gate
    })
    const revision = mutations.revision
    const deletion = mutations.delete('shared', async () => {
      order.push('delete')
    })
    const queued = mutations.run(async () =>
      mutations.reconcile({ ID: 'a', Tags: ['shared', 'keep'], Text: 'Unsaved text' }, revision)
    )
    await Promise.resolve()
    expect(order).toEqual(['save'])
    release()
    await saving
    await deletion
    expect(await queued).toEqual({ ID: 'a', Tags: ['keep'], Text: 'Unsaved text' })
    expect(order).toEqual(['save', 'delete'])
    // A deliberate assignment made after deletion is a new tag, not a stale write.
    expect(mutations.reconcile({ Tags: ['shared'] }, mutations.revision).Tags).toEqual(['shared'])
  })

  it('keeps drafts untouched and permits subsequent writes if deletion fails', async () => {
    const mutations = new TagMutations()
    let notified = false
    mutations.subscribe(() => {
      notified = true
    })
    const revision = mutations.revision
    await expect(
      mutations.delete('shared', async () => {
        throw new Error('offline')
      })
    ).rejects.toThrow('offline')
    expect(notified).toBe(false)
    expect(mutations.reconcile({ Tags: ['shared'] }, revision).Tags).toEqual(['shared'])
    expect(await mutations.run(async () => 'saved')).toBe('saved')
  })
})
