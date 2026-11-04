import type { EditorialReply, EditorialWorkspace, PieceKind } from '../../shared/editorial'
import type { Article } from '../article/model'
import type { Post } from '../post/model'

export interface EditorialRepository {
  transact(
    kind: PieceKind,
    pieceId: string,
    operation: (workspace: EditorialWorkspace, piece: Article | Post) => EditorialChange
  ): EditorialReply
}
export interface EditorialChange extends EditorialReply {
  newPiece?: Article | Post
  newWorkspace?: EditorialWorkspace
}
