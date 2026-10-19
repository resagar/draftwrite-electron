import { desc, eq, sql } from 'drizzle-orm'
import type { Article } from '../../../src/main/article/model'
import {
  errNotFound,
  errTitleTaken,
  type ArticleRepository
} from '../../../src/main/article/repository'
import type { AppDatabase } from '../../../src/main/db'
import { isUniqueConstraintError, parseDatabaseTime } from './mapping'
import { articles } from './schema'

type ArticleRow = typeof articles.$inferSelect

/** Article repository over SQLite, backed by the shared Drizzle client. */
export function newArticleRepository(db: AppDatabase): ArticleRepository {
  return {
    async create(article) {
      try {
        const row = db
          .insert(articles)
          .values({
            id: article.id,
            storyID: article.storyID,
            title: article.title,
            subtitle: article.subtitle,
            target: article.target,
            text: article.text
          })
          .returning()
          .get()
        return toArticle(row)
      } catch (error) {
        throw mapError(error)
      }
    },

    async get(id) {
      const row = db.select().from(articles).where(eq(articles.id, id)).get()
      return toArticle(row)
    },

    async listByStory(storyID) {
      const rows = db
        .select()
        .from(articles)
        .where(eq(articles.storyID, storyID))
        .orderBy(desc(articles.createdAt))
        .all()
      return rows.map(toArticle)
    },

    async list() {
      const rows = db.select().from(articles).orderBy(desc(articles.createdAt)).all()
      return rows.map(toArticle)
    },

    async update(article) {
      try {
        // story_id is never updated: an article cannot change its story.
        const row = db
          .update(articles)
          .set({
            title: article.title,
            subtitle: article.subtitle,
            target: article.target,
            text: article.text,
            updatedAt: sql`datetime('now')`
          })
          .where(eq(articles.id, article.id))
          .returning()
          .get()
        return toArticle(row)
      } catch (error) {
        throw mapError(error)
      }
    },

    async delete(id) {
      // Deleting a missing id is silent: the statement simply affects no rows.
      db.delete(articles).where(eq(articles.id, id)).run()
    }
  }
}

/**
 * Maps a storage row to the domain entity. A missing row (SELECT or UPDATE
 * that matched nothing) is the domain not-found error; INSERT ... RETURNING
 * always yields a row.
 */
function toArticle(row: ArticleRow | undefined): Article {
  if (row === undefined) {
    throw errNotFound
  }
  return {
    id: row.id,
    storyID: row.storyID,
    title: row.title,
    subtitle: row.subtitle,
    target: row.target,
    text: row.text,
    createdAt: parseDatabaseTime(row.createdAt),
    updatedAt: parseDatabaseTime(row.updatedAt)
  }
}

/**
 * Maps storage errors to domain errors: UNIQUE constraint violations become
 * the title-taken sentinel; anything else is rethrown as is.
 */
function mapError(error: unknown): unknown {
  if (isUniqueConstraintError(error)) {
    return errTitleTaken
  }
  return error
}
