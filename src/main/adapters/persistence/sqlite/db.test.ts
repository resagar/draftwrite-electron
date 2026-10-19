import { describe, expect, it } from '@jest/globals'
import { mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eq, sql } from 'drizzle-orm'
import { openDatabase, type AppDatabase } from '../../../db'
import { articles, stories } from './schema'

function listTables(db: AppDatabase): string[] {
  return db
    .all<{ name: string }>(sql`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)
    .map((row) => row.name)
}

function insertStory(db: AppDatabase, id: string, topic: string): void {
  db.insert(stories).values({ id, topic, titles: 'The lighthouse', text: 'Once upon a time' }).run()
}

describe('openDatabase', () => {
  it('applies the initial migration on an in-memory database', () => {
    const db = openDatabase(':memory:')

    expect(listTables(db)).toEqual(['__drizzle_migrations', 'articles', 'stories'])

    insertStory(db, 'story-1', 'a lighthouse')
    const [story] = db.select().from(stories).all()

    expect(story.topic).toBe('a lighthouse')
    expect(story.tags).toBe('')
    expect(story.createdAt).not.toBe('')
    expect(story.updatedAt).not.toBe('')
  })

  it('enforces the constraints of the initial migration', () => {
    const db = openDatabase(':memory:')
    insertStory(db, 'story-1', 'a lighthouse')
    db.insert(articles)
      .values({
        id: 'article-1',
        storyID: 'story-1',
        title: 'Chapter 1',
        subtitle: 'First light',
        target: 'fiction',
        text: 'Once upon a time'
      })
      .run()

    // UNIQUE(topic)
    expect(() => insertStory(db, 'story-2', 'a lighthouse')).toThrow()
    // UNIQUE(story_id, title)
    expect(() =>
      db
        .insert(articles)
        .values({
          id: 'article-2',
          storyID: 'story-1',
          title: 'Chapter 1',
          subtitle: '',
          target: '',
          text: ''
        })
        .run()
    ).toThrow()
    // story_id REFERENCES stories(id) ON DELETE CASCADE
    db.delete(stories).where(eq(stories.id, 'story-1')).run()
    expect(db.select().from(articles).all()).toHaveLength(0)
  })

  it('enables foreign key enforcement on the connection', () => {
    const db = openDatabase(':memory:')

    expect(db.get<{ foreign_keys: number }>(sql`PRAGMA foreign_keys`)).toEqual({
      foreign_keys: 1
    })
  })

  it('uses WAL and 0600 permissions for file-backed databases', () => {
    const dir = mkdtempSync(join(tmpdir(), 'draftwrite-db-'))
    const dbPath = join(dir, 'draftwrite.db')

    try {
      const db = openDatabase(dbPath)

      expect(db.get<{ journal_mode: string }>(sql`PRAGMA journal_mode`)).toEqual({
        journal_mode: 'wal'
      })
      if (process.platform !== 'win32') {
        expect(statSync(dbPath).mode & 0o777).toBe(0o600)
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
