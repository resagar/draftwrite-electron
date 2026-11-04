import type { EditorialRequest, EditorialAction, Writing } from '../../../shared/editorial'
import type { EditorialService } from '../../editorial/service'
import type { IpcHandlerRegistry } from './contract'
import { toIpcResult } from './errors'

function invalid(): never {
  throw Object.assign(new Error('Invalid editorial request'), { code: 'errInvalidPayload' })
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid()
  return value as Record<string, unknown>
}
function str(value: unknown, max = 200): string {
  if (typeof value !== 'string' || value.length > max) invalid()
  return value
}
function integer(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) invalid()
  return value as number
}
function writing(value: unknown): Writing {
  const p = record(value)
  const text = str(p.text, 5_000_000)
  if (p.kind === 'post') return { kind: 'post', topic: str(p.topic, 100_000), text }
  if (p.kind === 'article')
    return {
      kind: 'article',
      title: str(p.title, 1000),
      subtitle: str(p.subtitle, 1000),
      target: str(p.target, 1000),
      text
    }
  return invalid()
}
function parseAction(value: unknown): EditorialAction {
  const p = record(value)
  if (p.type === 'read') return { type: 'read' }
  const variantId = str(p.variantId)
  switch (p.type) {
    case 'plan':
      return { type: 'plan', variantId, sourceId: str(p.sourceId) }
    case 'integrate': {
      if (
        !Array.isArray(p.selected) ||
        !Array.isArray(p.noteIds) ||
        p.selected.length > 10000 ||
        p.noteIds.length > 10000
      )
        invalid()
      const resolutions = record(p.resolutions)
      return {
        type: 'integrate',
        variantId,
        sourceId: str(p.sourceId),
        selected: p.selected.map((v) => str(v)),
        noteIds: p.noteIds.map((v) => str(v)),
        resolutions: Object.fromEntries(
          Object.entries(resolutions).map(([key, value]) => [str(key), str(value, 5_000_000)])
        )
      }
    }
    case 'convert':
      return { type: 'convert', variantId, title: str(p.title, 1000) }
    case 'publish': {
      const date = str(p.date, 100)
      if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date) || !Number.isFinite(Date.parse(date))) invalid()
      const url = p.url === null ? null : str(p.url, 4000)
      if (url !== null) {
        try {
          if (!['https:', 'http:'].includes(new URL(url).protocol)) invalid()
        } catch {
          invalid()
        }
      }
      return { type: 'publish', variantId, versionId: str(p.versionId), date, url }
    }
    case 'branch':
      return { type: 'branch', variantId, versionId: str(p.versionId), name: str(p.name) }
    case 'primary':
      return { type: 'primary', variantId }
    case 'restore':
      return { type: 'restore', variantId, versionId: str(p.versionId) }
    case 'archive': {
      if (typeof p.archived !== 'boolean') invalid()
      return { type: 'archive', variantId, archived: p.archived }
    }
    case 'draft':
      return { type: 'draft', variantId, content: writing(p.content) }
    case 'version': {
      if (p.increment !== 'major' && p.increment !== 'minor' && p.increment !== 'patch') invalid()
      return {
        type: 'version',
        variantId,
        increment: p.increment,
        description: str(p.description, 4000)
      }
    }
    case 'note': {
      const anchor = p.anchor === null ? null : record(p.anchor)
      return {
        type: 'note',
        variantId,
        noteId: p.noteId === null ? null : str(p.noteId),
        text: str(p.text, 100_000),
        anchor: anchor
          ? {
              from: integer(anchor.from),
              to: integer(anchor.to),
              ...(anchor.quote === undefined ? {} : { quote: str(anchor.quote, 5_000_000) })
            }
          : null
      }
    }
    case 'resolveNote': {
      if (typeof p.resolved !== 'boolean') invalid()
      return { type: 'resolveNote', variantId, noteId: str(p.noteId), resolved: p.resolved }
    }
    default:
      return invalid()
  }
}
export function registerEditorialHandlers(
  ipc: IpcHandlerRegistry,
  service: EditorialService
): void {
  ipc.handle('editorial:execute', (_event, payload) =>
    toIpcResult(async () => {
      const p = record(payload)
      if (p.kind !== 'article' && p.kind !== 'post') invalid()
      const action = parseAction(p.action)
      const request: EditorialRequest = {
        kind: p.kind,
        pieceId: str(p.pieceId),
        action,
        ...(action.type === 'read' ? {} : { revision: integer(p.revision) })
      }
      return service.execute(request)
    })
  )
}
