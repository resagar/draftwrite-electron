import { expect, it } from '@jest/globals'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { bootstrap, closeDatabase } from '../bootstrap'
import { registerIpcHandlers } from '../adapters/ipc/register'
import { APP_DIR_NAME, DB_FILE_NAME } from '../platform/data-dir'
import type { EditorialReply } from '../../shared/editorial'

it('migrates pre-editorial Articles and scheduled Posts without inventing history or changing their data', async () => {
  const root = mkdtempSync(join(tmpdir(), 'draftwrite-editorial-migration-'))
  const previous = join(root, 'previous-migrations')
  const source = join(__dirname, '../adapters/persistence/sqlite/migrations')
  mkdirSync(join(previous, 'meta'), { recursive: true })
  const journal = JSON.parse(readFileSync(join(source, 'meta/_journal.json'), 'utf8')) as {
    entries: { tag: string }[]
  }
  journal.entries = journal.entries.slice(0, 4)
  writeFileSync(join(previous, 'meta/_journal.json'), JSON.stringify(journal))
  for (const entry of journal.entries)
    copyFileSync(join(source, entry.tag + '.sql'), join(previous, entry.tag + '.sql'))
  mkdirSync(join(root, APP_DIR_NAME), { recursive: true })
  const sqlite = new Database(join(root, APP_DIR_NAME, DB_FILE_NAME))
  migrate(drizzle(sqlite), { migrationsFolder: previous })
  sqlite
    .prepare(
      "INSERT INTO stories(id,topic,titles,tags,text) VALUES ('source','An existing Story','','','Source text')"
    )
    .run()
  sqlite
    .prepare(
      "INSERT INTO articles(id,story_id,title,subtitle,target,text,created_at,updated_at) VALUES ('article','source','Existing title','Existing subtitle','Existing target','Existing manuscript','2026-01-01 12:00:00','2026-01-02 12:00:00')"
    )
    .run()
  sqlite
    .prepare(
      "INSERT INTO posts(id,topic,text,state,scheduled_at,story_id,created_at,updated_at) VALUES ('post','Existing topic','Existing Post','scheduled','2027-01-01T12:00:00.000Z','source','2026-01-01 12:00:00','2026-01-02 12:00:00')"
    )
    .run()
  sqlite.close()
  const app = bootstrap({ platform: 'linux', env: { XDG_DATA_HOME: root } })
  try {
    const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>()
    registerIpcHandlers(
      {
        handle: (name, handler) => {
          handlers.set(name, handler)
        }
      },
      app.services
    )
    expect(await app.services.article.get('article')).toMatchObject({
      storyID: 'source',
      title: 'Existing title',
      subtitle: 'Existing subtitle',
      target: 'Existing target',
      text: 'Existing manuscript',
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-02T12:00:00.000Z'
    })
    expect(await app.services.post.get('post')).toMatchObject({
      topic: 'Existing topic',
      text: 'Existing Post',
      state: 'scheduled',
      scheduledAt: '2027-01-01T12:00:00.000Z',
      storyID: 'source',
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-02T12:00:00.000Z'
    })
    for (const kind of ['article', 'post']) {
      const reply = (await handlers.get('editorial:execute')!(
        {},
        { kind, pieceId: kind, action: { type: 'read' } }
      )) as { value: EditorialReply }
      expect(reply).toMatchObject({
        ok: true,
        value: {
          workspace: {
            versions: [],
            publications: [],
            variants: [expect.objectContaining({ name: 'Main', number: '0.0.0' })]
          }
        }
      })
      expect(
        await handlers.get('editorial:execute')!(
          {},
          {
            kind,
            pieceId: kind,
            revision: reply.value.workspace.revision,
            action: {
              type: 'version',
              variantId: reply.value.workspace.primaryId,
              increment: 'patch',
              description: 'No changes since migration'
            }
          }
        )
      ).toMatchObject({ ok: false, error: { code: 'errEditorialUnchanged' } })
    }
  } finally {
    closeDatabase(app.db)
    rmSync(root, { recursive: true, force: true })
  }
})
