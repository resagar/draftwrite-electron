import { randomUUID } from 'node:crypto'
import { newArticle, type Article } from '../article/model'
import { newPost, type Post } from '../post/model'
import { hasEditorialChanges, nextEditorialNumber } from '../../shared/editorial'
export { hasEditorialChanges as hasPending } from '../../shared/editorial'
import type {
  EditorialWorkspace,
  EditorialVariant,
  Writing,
  Increment,
  ReviewNote,
  EditorialVersion
} from '../../shared/editorial'

function error(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code })
}
export const errEditorialNotFound = error('errEditorialNotFound', 'Editorial item not found')
export const errEditorialStale = error(
  'errEditorialStale',
  'This draft changed elsewhere. Reload before continuing.'
)
export const errEditorialUnchanged = error(
  'errEditorialUnchanged',
  'There are no editorial changes to version.'
)
export const errEditorialPending = error(
  'errEditorialPending',
  'Save a version of pending changes before continuing.'
)
export const errEditorialInvalid = error('errEditorialInvalid', 'Invalid editorial operation')

export function reconcilePrimary(workspace: EditorialWorkspace, content: Writing): void {
  const primary = getVariant(workspace, workspace.primaryId)
  if (JSON.stringify(primary.content) === JSON.stringify(content)) return
  reanchorNotes(primary.notes, primary.content.text, content.text)
  primary.content = content
  workspace.revision++
}

export function writingOf(piece: Article | Post): Writing {
  return 'title' in piece
    ? {
        kind: 'article',
        title: piece.title,
        subtitle: piece.subtitle,
        target: piece.target,
        text: piece.text
      }
    : { kind: 'post', topic: piece.topic, text: piece.text }
}

export function resolveNote(variant: EditorialVariant, noteId: string, resolved: boolean): void {
  const note = variant.notes.find((n) => n.id === noteId)
  if (!note) throw errEditorialNotFound
  note.resolved = resolved
}

export function designatePrimary(workspace: EditorialWorkspace, variant: EditorialVariant): void {
  if (variant.archived) throw errEditorialInvalid
  workspace.primaryId = variant.id
}

export function archiveVariant(
  workspace: EditorialWorkspace,
  variant: EditorialVariant,
  archived: boolean
): void {
  if (archived && variant.id === workspace.primaryId) throw errEditorialInvalid
  variant.archived = archived
}

export function normaliseWriting(content: Writing): Writing {
  return content.kind === 'article'
    ? {
        ...content,
        title: content.title.trim(),
        subtitle: content.subtitle.trim(),
        target: content.target.trim()
      }
    : { ...content, topic: content.topic.trim() }
}

export function newIndependentPiece(
  source: Article | Post,
  writing: Writing
): { piece: Article | Post; content: Writing } {
  const content = normaliseWriting(writing)
  if (content.kind === 'article' && 'title' in source) {
    const piece = newArticle(
      source.storyID,
      content.title,
      content.subtitle,
      content.target,
      content.text
    )
    return { piece: { ...piece, text: content.text }, content }
  }
  if (content.kind === 'post' && 'topic' in source) {
    const piece = newPost(content.topic, content.text, source.storyID, source.articleID)
    return { piece: { ...piece, text: content.text }, content }
  }
  throw errEditorialInvalid
}

export function recordPublication(
  workspace: EditorialWorkspace,
  versionId: string,
  date: string,
  url: string | null
): void {
  getVersion(workspace, versionId)
  workspace.publications.push({ id: randomUUID(), versionId, date, url })
}

export function convertVariant(
  workspace: EditorialWorkspace,
  variant: EditorialVariant,
  pieceId: string,
  content: Writing
): EditorialWorkspace {
  if (workspace.primaryId === variant.id || variant.archived) throw errEditorialInvalid
  const ids = new Set<string>()
  let head = variant.headId
  while (head && !ids.has(head)) {
    ids.add(head)
    head = getVersion(workspace, head).parentId
  }
  const next: EditorialWorkspace = {
    kind: workspace.kind,
    pieceId,
    revision: 0,
    primaryId: variant.id,
    variants: [{ ...structuredClone(variant), content }],
    versions: structuredClone(workspace.versions.filter((v) => ids.has(v.id))),
    publications: [],
    origin: { pieceId: workspace.pieceId, variantId: variant.id },
    conversions: []
  }
  variant.archived = true
  workspace.conversions.push({ pieceId, variantId: variant.id })
  return next
}

export function getVersion(workspace: EditorialWorkspace, id: string): EditorialVersion {
  const version = workspace.versions.find((v) => v.id === id)
  if (!version) throw errEditorialNotFound
  return version
}

export function branchFrom(workspace: EditorialWorkspace, versionId: string, name: string): void {
  if (!name.trim() || workspace.variants.some((v) => v.name === name.trim()))
    throw errEditorialInvalid
  const version = getVersion(workspace, versionId)
  const notes = version.notes
    .filter((n) => !n.resolved)
    .map((note) => ({
      ...structuredClone(note),
      id: randomUUID(),
      origin: { pieceId: workspace.pieceId, variantId: version.variantId, noteId: note.id }
    }))
  workspace.variants.push({
    id: randomUUID(),
    name: name.trim(),
    number: version.number,
    archived: false,
    baseId: version.id,
    headId: version.id,
    content: structuredClone(version.content),
    initialContent: structuredClone(version.content),
    notes,
    pendingIntegrations: []
  })
}

export function restoreVersion(
  workspace: EditorialWorkspace,
  variant: EditorialVariant,
  versionId: string
): void {
  if (hasEditorialChanges(workspace, variant)) throw errEditorialPending
  const version = getVersion(workspace, versionId)
  reanchorNotes(variant.notes, variant.content.text, version.content.text)
  variant.content = structuredClone(version.content)
}

export function reanchorNotes(notes: ReviewNote[], before: string, after: string): void {
  if (before === after) return
  for (const note of notes) {
    const anchor = note.anchor
    if (!anchor || anchor.detached) continue
    const start = after.indexOf(anchor.quote)
    if (
      start < 0 ||
      after.indexOf(anchor.quote, start + 1) >= 0 ||
      before.indexOf(anchor.quote) !== before.lastIndexOf(anchor.quote)
    )
      anchor.detached = true
    else {
      anchor.from = start
      anchor.to = start + anchor.quote.length
    }
  }
}

export function writeNote(
  variant: EditorialVariant,
  noteId: string | null,
  text: string,
  range: { from: number; to: number; quote?: string } | null
): void {
  if (!text.trim()) throw errEditorialInvalid
  if (
    range &&
    (range.from < 0 ||
      range.to <= range.from ||
      (!range.quote && range.to > variant.content.text.length))
  )
    throw errEditorialInvalid
  const note = noteId ? variant.notes.find((n) => n.id === noteId) : null
  if (noteId && !note) throw errEditorialNotFound
  const anchor = range
    ? {
        ...range,
        quote: range.quote ?? variant.content.text.slice(range.from, range.to),
        detached:
          range.quote !== undefined &&
          variant.content.text.slice(range.from, range.to) !== range.quote
      }
    : null
  if (note) {
    note.text = text.trim()
    note.anchor = anchor ?? note.anchor
  } else
    variant.notes.push({
      id: randomUUID(),
      text: text.trim(),
      resolved: false,
      anchor,
      origin: null
    })
}

export function getVariant(workspace: EditorialWorkspace, id: string): EditorialVariant {
  const variant = workspace.variants.find((v) => v.id === id)
  if (!variant) throw errEditorialNotFound
  return variant
}

export function saveVersion(
  workspace: EditorialWorkspace,
  variant: EditorialVariant,
  increment: Increment,
  description: string
): void {
  if (variant.archived || !description.trim()) throw errEditorialInvalid
  if (!hasEditorialChanges(workspace, variant)) throw errEditorialUnchanged
  const version = {
    id: randomUUID(),
    variantId: variant.id,
    variantName: variant.name,
    number: nextEditorialNumber(variant.number, increment),
    description: description.trim(),
    createdAt: new Date().toISOString(),
    parentId: variant.headId,
    integratedFrom: [...variant.pendingIntegrations],
    content: structuredClone(variant.content),
    notes: structuredClone(variant.notes)
  }
  workspace.versions.push(version)
  variant.headId = version.id
  variant.number = version.number
  variant.pendingIntegrations = []
}

export function newEditorialWorkspace(
  pieceId: string,
  content: Writing,
  initialContent: Writing = content
): EditorialWorkspace {
  const id = randomUUID()
  return {
    kind: content.kind,
    pieceId,
    revision: 0,
    primaryId: id,
    variants: [
      {
        id,
        name: 'Main',
        number: '0.0.0',
        archived: false,
        baseId: null,
        headId: null,
        content,
        initialContent: structuredClone(initialContent),
        notes: [],
        pendingIntegrations: []
      }
    ],
    versions: [],
    publications: [],
    origin: null,
    conversions: []
  }
}
