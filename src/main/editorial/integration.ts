import { randomUUID } from 'node:crypto'
import type {
  EditorialWorkspace,
  EditorialVariant,
  IntegrationPlan,
  IntegrationChunk,
  Writing,
  EditorialAction
} from '../../shared/editorial'
import {
  textChanges,
  applyTextChanges,
  overlaps,
  type TextChange
} from '../../shared/editorial-diff'
import {
  errEditorialInvalid,
  errEditorialPending,
  getVersion,
  hasPending,
  reanchorNotes
} from './model'
import { noteRelatesToChange } from '../../shared/editorial'

export const errEditorialConflict = Object.assign(
  new Error('Resolve every selected conflict before applying changes.'),
  { code: 'errEditorialConflict' }
)

function ancestors(workspace: EditorialWorkspace, id: string | null): string[] {
  const result: string[] = []
  const queue = id ? [id] : []
  while (queue.length) {
    const next = queue.shift()!
    if (result.includes(next)) continue
    result.push(next)
    const version = getVersion(workspace, next)
    if (version.parentId) queue.push(version.parentId)
    // Selective integration records provenance, not adoption of every source change.
  }
  return result
}

export function writingFields(content: Writing): string[] {
  return content.kind === 'article' ? ['title', 'subtitle', 'target', 'text'] : ['topic', 'text']
}
export function fieldValue(content: Writing, field: string): string {
  return Object.prototype.hasOwnProperty.call(content, field) && field !== 'kind'
    ? String(content[field as keyof Writing])
    : ''
}

export function planIntegration(
  workspace: EditorialWorkspace,
  target: EditorialVariant,
  sourceId: string
): IntegrationPlan {
  const source = getVersion(workspace, sourceId)
  if (source.variantId === target.id) throw errEditorialInvalid
  const sourceHistory = new Set(ancestors(workspace, sourceId))
  const baseId = ancestors(workspace, target.headId).find((id) => sourceHistory.has(id))
  if (!baseId) throw errEditorialInvalid
  const base = getVersion(workspace, baseId)
  const chunks: IntegrationChunk[] = []
  for (const field of writingFields(source.content)) {
    const original = fieldValue(base.content, field)
    const incoming = textChanges(original, fieldValue(source.content, field))
    const current = textChanges(original, fieldValue(target.content, field))
    const all = [
      ...incoming.map((edit) => ({ ...edit, source: true })),
      ...current.map((edit) => ({ ...edit, source: false }))
    ].sort((a, b) => a.from - b.from || a.to - b.to)
    const groups: { from: number; to: number; edits: typeof all }[] = []
    for (const edit of all) {
      const last = groups.at(-1)
      if (last && overlaps(last, edit)) {
        last.to = Math.max(last.to, edit.to)
        last.edits.push(edit)
      } else groups.push({ from: edit.from, to: edit.to, edits: [edit] })
    }
    for (const group of groups) {
      if (!group.edits.some((edit) => edit.source)) continue
      const baseText = original.slice(group.from, group.to)
      const render = (fromSource: boolean): string =>
        applyTextChanges(
          baseText,
          group.edits
            .filter((edit) => edit.source === fromSource)
            .map((edit) => ({
              from: edit.from - group.from,
              to: edit.to - group.from,
              text: edit.text
            }))
        )
      const sourceText = render(true)
      const destination = render(false)
      if (sourceText === destination) continue
      const sourceFrom =
        group.from +
        incoming
          .filter((edit) => edit.to <= group.from && !overlaps(group, edit))
          .reduce((offset, edit) => offset + edit.text.length - (edit.to - edit.from), 0)
      chunks.push({
        id: field + ':' + group.from + ':' + group.to,
        field,
        from: group.from,
        to: group.to,
        base: baseText,
        source: sourceText,
        destination,
        conflict: group.edits.some((edit) => !edit.source),
        sourceFrom,
        sourceTo: sourceFrom + sourceText.length
      })
    }
  }
  return { baseId, sourceId, chunks, notes: source.notes.filter((note) => !note.resolved) }
}

export function integrateChanges(
  workspace: EditorialWorkspace,
  target: EditorialVariant,
  action: Extract<EditorialAction, { type: 'integrate' }>
): void {
  if (hasPending(workspace, target)) throw errEditorialPending
  const plan = planIntegration(workspace, target, action.sourceId)
  const selected = plan.chunks.filter((chunk) => action.selected.includes(chunk.id))
  if (!selected.length || selected.length !== new Set(action.selected).size)
    throw errEditorialInvalid
  const base = getVersion(workspace, plan.baseId)
  const oldText = target.content.text
  for (const field of writingFields(target.content)) {
    const chunks = selected.filter((chunk) => chunk.field === field)
    if (!chunks.length) continue
    const original = fieldValue(base.content, field)
    const changes: TextChange[] = textChanges(original, fieldValue(target.content, field)).filter(
      (edit) => !chunks.some((chunk) => overlaps(chunk, edit))
    )
    for (const chunk of chunks) {
      if (chunk.conflict && !Object.prototype.hasOwnProperty.call(action.resolutions, chunk.id))
        throw errEditorialConflict
      changes.push({
        from: chunk.from,
        to: chunk.to,
        text: chunk.conflict ? action.resolutions[chunk.id] : chunk.source
      })
    }
    Object.assign(target.content, { [field]: applyTextChanges(original, changes) })
  }
  reanchorNotes(target.notes, oldText, target.content.text)
  const source = getVersion(workspace, action.sourceId)
  for (const id of new Set(action.noteIds)) {
    const note = plan.notes.find((n) => n.id === id)
    if (!note) throw errEditorialInvalid
    if (!selected.some((chunk) => noteRelatesToChange(note, chunk))) throw errEditorialInvalid
    const copy = {
      ...structuredClone(note),
      id: randomUUID(),
      origin: { pieceId: workspace.pieceId, variantId: source.variantId, noteId: note.id }
    }
    reanchorNotes([copy], source.content.text, target.content.text)
    target.notes.push(copy)
  }
  if (!target.pendingIntegrations.includes(source.id)) target.pendingIntegrations.push(source.id)
}
