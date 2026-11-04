import type { EditorialRequest, EditorialReply } from '../../shared/editorial'
import type { EditorialRepository } from './repository'
import {
  errEditorialInvalid,
  errEditorialStale,
  getVariant,
  saveVersion,
  writeNote,
  reanchorNotes,
  branchFrom,
  restoreVersion,
  recordPublication,
  convertVariant,
  normaliseWriting,
  newIndependentPiece,
  reconcilePrimary,
  writingOf,
  resolveNote,
  designatePrimary,
  archiveVariant
} from './model'
import { validateArticle } from '../article/model'
import { validatePost } from '../post/model'
import { planIntegration, integrateChanges } from './integration'

export interface EditorialService {
  execute(request: EditorialRequest): Promise<EditorialReply>
}
export function newEditorialService(repository: EditorialRepository): EditorialService {
  return {
    async execute(request) {
      return repository.transact(request.kind, request.pieceId, (workspace, piece) => {
        reconcilePrimary(workspace, writingOf(piece))
        const action = request.action
        if (action.type === 'read') return { workspace }
        if (request.revision !== workspace.revision) throw errEditorialStale
        const variant = getVariant(workspace, action.variantId)
        if (variant.archived && action.type !== 'archive' && action.type !== 'publish')
          throw errEditorialInvalid
        if (action.type === 'plan')
          return { workspace, plan: planIntegration(workspace, variant, action.sourceId) }
        if (action.type === 'convert') {
          const content =
            variant.content.kind === 'article'
              ? { ...variant.content, title: action.title }
              : { ...variant.content, topic: action.title }
          const { piece: newPiece, content: normalised } = newIndependentPiece(piece, content)
          const newWorkspace = convertVariant(workspace, variant, newPiece.id, normalised)
          workspace.revision++
          return {
            workspace,
            newPiece,
            newWorkspace,
            converted: { kind: workspace.kind, pieceId: newPiece.id }
          }
        }
        if (action.type === 'draft') {
          const content = normaliseWriting(action.content)
          if (content.kind !== request.kind) throw errEditorialInvalid
          if (content.kind === 'article' && 'title' in piece)
            validateArticle({ ...piece, ...content })
          else if (content.kind === 'post' && 'topic' in piece)
            validatePost({ ...piece, ...content })
          else throw errEditorialInvalid
          reanchorNotes(variant.notes, variant.content.text, content.text)
          variant.content = content
        } else if (action.type === 'version')
          saveVersion(workspace, variant, action.increment, action.description)
        else if (action.type === 'note')
          writeNote(variant, action.noteId, action.text, action.anchor)
        else if (action.type === 'resolveNote') resolveNote(variant, action.noteId, action.resolved)
        else if (action.type === 'branch') branchFrom(workspace, action.versionId, action.name)
        else if (action.type === 'restore') restoreVersion(workspace, variant, action.versionId)
        else if (action.type === 'primary') designatePrimary(workspace, variant)
        else if (action.type === 'archive') archiveVariant(workspace, variant, action.archived)
        else if (action.type === 'publish')
          recordPublication(workspace, action.versionId, action.date, action.url)
        else if (action.type === 'integrate') {
          integrateChanges(workspace, variant, action)
          variant.content = normaliseWriting(variant.content)
          if (variant.content.kind === 'article' && 'title' in piece)
            validateArticle({ ...piece, ...variant.content })
          else if (variant.content.kind === 'post' && 'topic' in piece)
            validatePost({ ...piece, ...variant.content })
        }
        workspace.revision++
        return { workspace }
      })
    }
  }
}
