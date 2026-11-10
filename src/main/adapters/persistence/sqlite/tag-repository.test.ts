import { afterEach, describe, expect, it } from '@jest/globals'
import { sql } from 'drizzle-orm'
import { mkdtempSync, readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { closeDatabase } from '../../../bootstrap'
import { openDatabase, type AppDatabase } from '../../../db'
import { newStory } from '../../../story/model'
import { newArticle } from '../../../article/model'
import { newPost } from '../../../post/model'
import { newTagService } from '../../../tag/service'
import { newStoryRepository } from './story-repository'
import { newArticleRepository } from './article-repository'
import { newPostRepository } from './post-repository'
import { newTagRepository } from './tag-repository'

const databases: AppDatabase[] = []
afterEach(() => {
  for (const db of databases.splice(0)) closeDatabase(db)
})

async function fixture(): Promise<{
  db: AppDatabase
  stories: ReturnType<typeof newStoryRepository>
  articles: ReturnType<typeof newArticleRepository>
  posts: ReturnType<typeof newPostRepository>
  tags: ReturnType<typeof newTagService>
  story: ReturnType<typeof newStory>
  article: ReturnType<typeof newArticle>
  post: ReturnType<typeof newPost>
}> {
  const db = openDatabase(':memory:')
  databases.push(db)
  const stories = newStoryRepository(db)
  const articles = newArticleRepository(db)
  const posts = newPostRepository(db)
  const tags = newTagService(newTagRepository(db))
  const story = await stories.create(newStory('Source', [], ['shared', 'Shared'], 'Story body'))
  const article = await articles.create(
    newArticle(story.id, 'Article', '', '', 'Article body', ['shared', 'article'])
  )
  const post = await posts.create(
    newPost('Post', 'Post body', null, article.id, ['shared', 'post'])
  )
  await tags.setColor('shared', 'teal')
  return { db, stories, articles, posts, tags, story, article, post }
}

describe('tag persistence', () => {
  it('stores independent tags and removes exact matches across all entities without touching content', async () => {
    const f = await fixture()
    expect(await f.tags.impact('shared')).toEqual({ stories: 1, articles: 1, posts: 1 })
    await f.tags.deleteEverywhere('shared')
    expect(await f.stories.get(f.story.id)).toMatchObject({ tags: ['Shared'], text: 'Story body' })
    expect(await f.articles.get(f.article.id)).toMatchObject({
      tags: ['article'],
      text: 'Article body',
      storyID: f.story.id
    })
    expect(await f.posts.get(f.post.id)).toMatchObject({
      tags: ['post'],
      text: 'Post body',
      articleID: f.article.id
    })
    expect(await f.tags.list()).toEqual([])
    expect(await f.tags.impact('shared')).toEqual({ stories: 0, articles: 0, posts: 0 })
  })

  it('rolls back every table and color if a later update fails', async () => {
    const f = await fixture()
    f.db.run(
      sql`CREATE TRIGGER fail_tag_delete BEFORE UPDATE OF tags ON posts BEGIN SELECT RAISE(ABORT, 'blocked'); END`
    )
    await expect(f.tags.deleteEverywhere('shared')).rejects.toThrow()
    expect((await f.stories.get(f.story.id)).tags).toContain('shared')
    expect((await f.articles.get(f.article.id)).tags).toContain('shared')
    expect((await f.posts.get(f.post.id)).tags).toContain('shared')
    expect(await f.tags.list()).toEqual([{ name: 'shared', color: 'teal' }])
  })

  it('persists colors and own tags after reopening a file database', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'draftwrite-tag-reopen-'))
    try {
      const file = join(dir, 'test.db')
      const first = openDatabase(file)
      const story = await newStoryRepository(first).create(newStory('Source', [], [], ''))
      const article = await newArticleRepository(first).create(
        newArticle(story.id, 'Article', '', '', '', ['own'])
      )
      const post = await newPostRepository(first).create(newPost('Post', '', null, null, ['own']))
      await newTagService(newTagRepository(first)).setColor('own', 'violet')
      closeDatabase(first)
      const reopened = openDatabase(file)
      databases.push(reopened)
      expect((await newArticleRepository(reopened).get(article.id)).tags).toEqual(['own'])
      expect((await newPostRepository(reopened).get(post.id)).tags).toEqual(['own'])
      expect(await newTagRepository(reopened).list()).toEqual([{ name: 'own', color: 'violet' }])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('migrates the previous schema without changing existing assignments or content', () => {
    const dir = mkdtempSync(join(tmpdir(), 'draftwrite-tag-migrate-'))
    try {
      const previous = join(dir, 'migrations')
      mkdirSync(join(previous, 'meta'), { recursive: true })
      const source = join(__dirname, 'migrations')
      const journal = JSON.parse(readFileSync(join(source, 'meta/_journal.json'), 'utf8'))
      journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx < 5)
      writeFileSync(join(previous, 'meta/_journal.json'), JSON.stringify(journal))
      for (const file of readdirSync(source).filter((name) => /^000[0-4].*\.sql$/.test(name)))
        writeFileSync(join(previous, file), readFileSync(join(source, file)))
      const filename = join(dir, 'test.db')
      const sqlite = new Database(filename)
      migrate(drizzle(sqlite), { migrationsFolder: previous })
      sqlite.exec(
        "INSERT INTO stories (id,topic,titles,tags,text) VALUES ('s','Source','','legacy','body'); INSERT INTO articles (id,story_id,title,subtitle,target,text) VALUES ('a','s','Article','','','article'); INSERT INTO posts (id,topic,text) VALUES ('p','Post','post');"
      )
      sqlite.close()
      const db = openDatabase(filename)
      databases.push(db)
      expect(db.get(sql`SELECT tags, text FROM stories WHERE id = 's'`)).toEqual({
        tags: 'legacy',
        text: 'body'
      })
      expect(db.get(sql`SELECT tags, text FROM articles WHERE id = 'a'`)).toEqual({
        tags: '',
        text: 'article'
      })
      expect(db.get(sql`SELECT tags, text FROM posts WHERE id = 'p'`)).toEqual({
        tags: '',
        text: 'post'
      })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects invalid names and colors without writing metadata', async () => {
    const f = await fixture()
    await expect(f.tags.setColor(' shared ', 'teal')).rejects.toThrow('Invalid tag name')
    await expect(f.tags.setColor('shared', 'invalid' as 'teal')).rejects.toThrow(
      'Invalid tag color'
    )
    expect(await f.tags.list()).toEqual([{ name: 'shared', color: 'teal' }])
  })
})
