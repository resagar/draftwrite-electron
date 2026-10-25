import { desc, eq, sql } from 'drizzle-orm'
import type { Post, PostState } from '../../../post/model'
import { errNotFound, type PostRepository } from '../../../post/repository'
import type { AppDatabase } from '../../../db'
import { parseDatabaseTime } from './mapping'
import { posts } from './schema'

type PostRow = typeof posts.$inferSelect

/** Post repository over SQLite, backed by the shared Drizzle client. */
export function newPostRepository(db: AppDatabase): PostRepository {
  return {
    async create(post) {
      const row = db
        .insert(posts)
        .values({
          id: post.id,
          topic: post.topic,
          text: post.text,
          state: post.state
        })
        .returning()
        .get()
      return toPost(row)
    },

    async get(id) {
      const row = db.select().from(posts).where(eq(posts.id, id)).get()
      return toPost(row)
    },

    async list() {
      const rows = db.select().from(posts).orderBy(desc(posts.createdAt)).all()
      return rows.map(toPost)
    },

    async update(post) {
      const row = db
        .update(posts)
        .set({
          topic: post.topic,
          text: post.text,
          state: post.state,
          updatedAt: sql`datetime('now')`
        })
        .where(eq(posts.id, post.id))
        .returning()
        .get()
      return toPost(row)
    }
  }
}

/**
 * Maps a storage row to the domain entity. A missing row (SELECT or UPDATE
 * that matched nothing) is the domain not-found error; INSERT ... RETURNING
 * always yields a row.
 */
function toPost(row: PostRow | undefined): Post {
  if (row === undefined) {
    throw errNotFound
  }
  return {
    id: row.id,
    topic: row.topic,
    text: row.text,
    state: row.state as PostState,
    createdAt: parseDatabaseTime(row.createdAt),
    updatedAt: parseDatabaseTime(row.updatedAt)
  }
}
