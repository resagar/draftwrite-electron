export type PieceKind = 'article' | 'post'
export type Writing =
  | { kind: 'article'; title: string; subtitle: string; target: string; text: string }
  | { kind: 'post'; topic: string; text: string }

export interface ReviewNote {
  id: string
  text: string
  resolved: boolean
  anchor: { from: number; to: number; quote: string; detached: boolean } | null
  origin: { pieceId: string; variantId: string; noteId: string } | null
}

export interface EditorialVersion {
  id: string
  variantId: string
  variantName?: string
  number: string
  description: string
  createdAt: string
  parentId: string | null
  integratedFrom: string[]
  content: Writing
  notes: ReviewNote[]
}

export interface EditorialVariant {
  id: string
  name: string
  number: string
  archived: boolean
  baseId: string | null
  headId: string | null
  content: Writing
  notes: ReviewNote[]
  pendingIntegrations: string[]
  initialContent: Writing
}

export interface EditorialWorkspace {
  kind: PieceKind
  pieceId: string
  revision: number
  primaryId: string
  variants: EditorialVariant[]
  versions: EditorialVersion[]
  publications: { id: string; versionId: string; date: string; url: string | null }[]
  origin: { pieceId: string; variantId: string } | null
  conversions: { pieceId: string; variantId: string }[]
}

export type Increment = 'major' | 'minor' | 'patch'
export type EditorialAction =
  | { type: 'read' }
  | { type: 'draft'; variantId: string; content: Writing }
  | { type: 'version'; variantId: string; increment: Increment; description: string }
  | {
      type: 'note'
      variantId: string
      noteId: string | null
      text: string
      anchor: { from: number; to: number; quote?: string } | null
    }
  | { type: 'resolveNote'; variantId: string; noteId: string; resolved: boolean }
  | { type: 'branch'; variantId: string; versionId: string; name: string }
  | { type: 'primary'; variantId: string }
  | { type: 'archive'; variantId: string; archived: boolean }
  | { type: 'restore'; variantId: string; versionId: string }
  | { type: 'publish'; variantId: string; versionId: string; date: string; url: string | null }
  | { type: 'convert'; variantId: string; title: string }
  | { type: 'plan'; variantId: string; sourceId: string }
  | {
      type: 'integrate'
      variantId: string
      sourceId: string
      selected: string[]
      resolutions: Record<string, string>
      noteIds: string[]
    }
export interface EditorialRequest {
  kind: PieceKind
  pieceId: string
  revision?: number
  action: EditorialAction
}
export interface IntegrationChunk {
  id: string
  field: string
  from: number
  to: number
  base: string
  source: string
  destination: string
  conflict: boolean
  sourceFrom: number
  sourceTo: number
}
export interface IntegrationPlan {
  baseId: string
  sourceId: string
  chunks: IntegrationChunk[]
  notes: ReviewNote[]
}
export interface EditorialReply {
  workspace: EditorialWorkspace
  converted?: { kind: PieceKind; pieceId: string }
  plan?: IntegrationPlan
}

export function nextEditorialNumber(number: string, increment: Increment): string {
  const values = number.split('.').map(Number)
  const index = { major: 0, minor: 1, patch: 2 }[increment]
  values[index]++
  for (let i = index + 1; i < 3; i++) values[i] = 0
  return values.join('.')
}

export function hasEditorialChanges(
  workspace: EditorialWorkspace,
  variant: EditorialVariant
): boolean {
  const version = workspace.versions.find((v) => v.id === variant.headId)
  if (!version)
    return (
      JSON.stringify([variant.content, variant.notes]) !==
      JSON.stringify([variant.initialContent, []])
    )
  const review = (notes: ReviewNote[]): unknown =>
    notes.map(({ text, resolved, anchor }) => ({ text, resolved, anchor }))
  const expected =
    version.variantId === variant.id ? version.notes : version.notes.filter((n) => !n.resolved)
  return (
    JSON.stringify([variant.content, review(variant.notes)]) !==
    JSON.stringify([version.content, review(expected)])
  )
}

export function noteRelatesToChange(note: ReviewNote, chunk: IntegrationChunk): boolean {
  return (
    !note.anchor ||
    (!note.anchor.detached &&
      chunk.field === 'text' &&
      note.anchor.from < chunk.sourceTo &&
      chunk.sourceFrom < note.anchor.to)
  )
}
