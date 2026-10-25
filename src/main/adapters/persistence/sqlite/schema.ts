import { sql } from 'drizzle-orm'
import { check, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

/**
 * Database schema, mirror of the initial SQL migration that lives in
 * `src/main/adapters/persistence/sqlite/migrations`.
 *
 * Column names stay snake_case in the database; the TypeScript properties are
 * camelCase like everywhere else in the app (`storyID` ↔ `story_id`).
 */

export const stories = sqliteTable('stories', {
  id: text('id').primaryKey(),
  topic: text('topic').notNull().unique(),
  titles: text('titles').notNull(),
  tags: text('tags').notNull().default(''),
  text: text('text').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`)
})

export const articles = sqliteTable(
  'articles',
  {
    id: text('id').primaryKey(),
    storyID: text('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    subtitle: text('subtitle').notNull(),
    target: text('target').notNull(),
    text: text('text').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`)
  },
  (table) => [unique().on(table.storyID, table.title)]
)

export const posts = sqliteTable(
  'posts',
  {
    id: text('id').primaryKey(),
    topic: text('topic').notNull(),
    text: text('text').notNull(),
    state: text('state').notNull().default('pending'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`)
  },
  (table) => [
    check('posts_state_check', sql`${table.state} in ('pending', 'scheduled', 'published')`)
  ]
)
