import { eq, sql } from 'drizzle-orm'
import type { AppDatabase } from '../../../db'
import { newEditorialWorkspace, getVariant, errEditorialNotFound } from '../../../editorial/model'
import type { EditorialRepository } from '../../../editorial/repository'
import type { EditorialWorkspace, Writing } from '../../../../shared/editorial'
import { articles, posts } from './schema'
import { parseDatabaseTime, isUniqueConstraintError } from './mapping'
import { errTitleTaken } from '../../../article/repository'

export function newEditorialRepository(db: AppDatabase): EditorialRepository {
  // Backfill existing pieces without fabricating historical versions or changing their timestamps.
  db.transaction((tx) => {
    for (const row of tx.select().from(articles).all())
      if (!row.editorial) {
        const workspace = newEditorialWorkspace(row.id, {
          kind: 'article',
          title: row.title,
          subtitle: row.subtitle,
          target: row.target,
          text: row.text
        })
        tx.update(articles)
          .set({ editorial: JSON.stringify(workspace) })
          .where(eq(articles.id, row.id))
          .run()
      }
    for (const row of tx.select().from(posts).all())
      if (!row.editorial) {
        const workspace = newEditorialWorkspace(row.id, {
          kind: 'post',
          topic: row.topic,
          text: row.text
        })
        tx.update(posts)
          .set({ editorial: JSON.stringify(workspace) })
          .where(eq(posts.id, row.id))
          .run()
      }
  })
  return {
    transact(kind, pieceId, operation) {
      try {
        return db.transaction((tx) => {
          const table = kind === 'article' ? articles : posts
          const row = tx.select().from(table).where(eq(table.id, pieceId)).get()
          if (!row) throw errEditorialNotFound
          const content: Writing =
            'title' in row
              ? {
                  kind: 'article',
                  title: row.title,
                  subtitle: row.subtitle,
                  target: row.target,
                  text: row.text
                }
              : { kind: 'post', topic: row.topic, text: row.text }
          const workspace: EditorialWorkspace = row.editorial
            ? JSON.parse(row.editorial)
            : newEditorialWorkspace(row.id, content)
          const initialRevision = workspace.revision
          const piece = {
            ...row,
            createdAt: parseDatabaseTime(row.createdAt),
            updatedAt: parseDatabaseTime(row.updatedAt)
          }
          const reply = operation(
            workspace,
            'title' in piece
              ? piece
              : { ...piece, state: piece.state as 'pending' | 'scheduled' | 'published' }
          )
          const next = getVariant(reply.workspace, reply.workspace.primaryId).content
          const editorial = JSON.stringify(reply.workspace)
          const timestamp =
            workspace.revision === initialRevision ? {} : { updatedAt: sql`datetime('now')` }
          if (reply.newPiece && reply.newWorkspace) {
            const created = reply.newPiece
            const values = {
              createdAt: sql`datetime('now')`,
              updatedAt: sql`datetime('now')`,
              editorial: JSON.stringify(reply.newWorkspace)
            }
            if ('title' in created)
              tx.insert(articles)
                .values({ ...created, ...values, editorial: JSON.stringify(reply.newWorkspace) })
                .run()
            else
              tx.insert(posts)
                .values({ ...created, ...values, editorial: JSON.stringify(reply.newWorkspace) })
                .run()
          }
          if (next.kind === 'article')
            tx.update(articles)
              .set({
                title: next.title,
                subtitle: next.subtitle,
                target: next.target,
                text: next.text,
                editorial,
                ...timestamp
              })
              .where(eq(articles.id, pieceId))
              .run()
          else
            tx.update(posts)
              .set({ topic: next.topic, text: next.text, editorial, ...timestamp })
              .where(eq(posts.id, pieceId))
              .run()
          return {
            workspace: reply.workspace,
            ...(reply.converted ? { converted: reply.converted } : {}),
            ...(reply.plan ? { plan: reply.plan } : {})
          }
        })
      } catch (error) {
        if (isUniqueConstraintError(error)) throw errTitleTaken
        throw error
      }
    }
  }
}
