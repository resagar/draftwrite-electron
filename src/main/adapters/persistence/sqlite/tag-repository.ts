import { eq, sql } from 'drizzle-orm'
import type { AppDatabase } from '../../../db'
import type { TagRepository } from '../../../tag/repository'
import { isTagColor, type TagImpact } from '../../../../shared/tags'
import { joinCsv, splitCsv } from './mapping'
import { articles, posts, stories, tagMetadata } from './schema'

export function newTagRepository(db: AppDatabase): TagRepository {
  return {
    async list() {
      return db
        .select()
        .from(tagMetadata)
        .all()
        .map((row) => {
          if (!isTagColor(row.color)) throw new Error('Invalid stored tag color')
          return { name: row.name, color: row.color }
        })
    },
    async setColor(name, color) {
      db.insert(tagMetadata)
        .values({ name, color })
        .onConflictDoUpdate({ target: tagMetadata.name, set: { color } })
        .run()
    },
    async impact(name) {
      const counts: TagImpact = { stories: 0, articles: 0, posts: 0 }
      for (const [key, table] of [
        ['stories', stories],
        ['articles', articles],
        ['posts', posts]
      ] as const) {
        counts[key] = db
          .select({ tags: table.tags })
          .from(table)
          .all()
          .filter((row) => splitCsv(row.tags).includes(name)).length
      }
      return counts
    },
    async deleteEverywhere(name) {
      db.transaction((tx) => {
        for (const table of [stories, articles, posts]) {
          const rows = tx.select({ id: table.id, tags: table.tags }).from(table).all()
          for (const row of rows) {
            const tags = splitCsv(row.tags)
            if (!tags.includes(name)) continue
            tx.update(table)
              .set({
                tags: joinCsv(tags.filter((tag) => tag !== name)),
                updatedAt: sql`datetime('now')`
              })
              .where(eq(table.id, row.id))
              .run()
          }
        }
        tx.delete(tagMetadata).where(eq(tagMetadata.name, name)).run()
      })
    }
  }
}
