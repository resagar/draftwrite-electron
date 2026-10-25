import { mkdirSync } from 'node:fs'
import { newArticleRepository } from './adapters/persistence/sqlite/article-repository'
import { newPostRepository } from './adapters/persistence/sqlite/post-repository'
import { newStoryRepository } from './adapters/persistence/sqlite/story-repository'
import { newArticleService, type ArticleService } from './article/service'
import { openDatabase, type AppDatabase } from './db'
import { resolveDataDir, resolveDatabasePath, type DataDirOptions } from './platform/data-dir'
import { newPostService, type PostService } from './post/service'
import { newStoryService, type StoryService } from './story/service'

/** Wired application: the services the IPC boundary exposes and the database. */
export interface Bootstrap {
  services: {
    story: StoryService
    article: ArticleService
    post: PostService
  }
  db: AppDatabase
}

/**
 * Wires the application for the given environment: resolves and creates the
 * data directory with owner-only permissions (the equivalent of the Go
 * `os.MkdirAll(dir, 0o700)`), opens the database and builds the repositories
 * and application services on top of it.
 */
export function bootstrap(options: DataDirOptions = {}): Bootstrap {
  const dataDir = resolveDataDir(options)
  mkdirSync(dataDir, { recursive: true, mode: 0o700 })

  const db = openDatabase(resolveDatabasePath(options))
  const storyRepo = newStoryRepository(db)
  const articleRepo = newArticleRepository(db)
  const postRepo = newPostRepository(db)

  return {
    services: {
      story: newStoryService(storyRepo),
      article: newArticleService(articleRepo, storyRepo),
      post: newPostService(postRepo)
    },
    db
  }
}

/**
 * Closes the underlying sqlite connection. Drizzle's class type does not
 * declare `$client` (only the `drizzle()` return type carries it), so the
 * property is narrowed structurally here instead of cast.
 */
export function closeDatabase(db: AppDatabase): void {
  if (!('$client' in db)) {
    return
  }
  const client: unknown = db.$client
  if (typeof client !== 'object' || client === null || !('close' in client)) {
    return
  }
  if (typeof client.close === 'function') {
    client.close()
  }
}
