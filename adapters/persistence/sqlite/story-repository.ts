import { desc, eq, sql } from 'drizzle-orm'
import type { AppDatabase } from '../../../src/main/db'
import type { Story } from '../../../src/main/story/model'
import {
  errNotFound,
  errTopicTaken,
  type StoryRepository
} from '../../../src/main/story/repository'
import { isUniqueConstraintError, joinCsv, parseDatabaseTime, splitCsv } from './mapping'
import { stories } from './schema'

type StoryRow = typeof stories.$inferSelect

/** Story repository over SQLite, backed by the shared Drizzle client. */
export function newStoryRepository(db: AppDatabase): StoryRepository {
  return {
    async create(story) {
      try {
        const row = db
          .insert(stories)
          .values({
            id: story.id,
            topic: story.topic,
            titles: joinCsv(story.titles),
            tags: joinCsv(story.tags),
            text: story.text
          })
          .returning()
          .get()
        return toStory(row)
      } catch (error) {
        throw mapError(error)
      }
    },

    async get(id) {
      const row = db.select().from(stories).where(eq(stories.id, id)).get()
      return toStory(row)
    },

    async list() {
      const rows = db.select().from(stories).orderBy(desc(stories.createdAt)).all()
      return rows.map(toStory)
    },

    async update(story) {
      try {
        const row = db
          .update(stories)
          .set({
            topic: story.topic,
            titles: joinCsv(story.titles),
            tags: joinCsv(story.tags),
            text: story.text,
            updatedAt: sql`datetime('now')`
          })
          .where(eq(stories.id, story.id))
          .returning()
          .get()
        return toStory(row)
      } catch (error) {
        throw mapError(error)
      }
    },

    async delete(id) {
      // Deleting a missing id is silent: the statement simply affects no rows.
      db.delete(stories).where(eq(stories.id, id)).run()
    }
  }
}

/**
 * Maps a storage row to the domain entity. A missing row (SELECT or UPDATE
 * that matched nothing) is the domain not-found error; INSERT ... RETURNING
 * always yields a row.
 */
function toStory(row: StoryRow | undefined): Story {
  if (row === undefined) {
    throw errNotFound
  }
  return {
    id: row.id,
    topic: row.topic,
    titles: splitCsv(row.titles),
    tags: splitCsv(row.tags),
    text: row.text,
    createdAt: parseDatabaseTime(row.createdAt),
    updatedAt: parseDatabaseTime(row.updatedAt)
  }
}

/**
 * Maps storage errors to domain errors: UNIQUE constraint violations become
 * the topic-taken sentinel; anything else is rethrown as is.
 */
function mapError(error: unknown): unknown {
  if (isUniqueConstraintError(error)) {
    return errTopicTaken
  }
  return error
}
