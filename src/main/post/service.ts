import { errNotFound as articleErrNotFound, type ArticleRepository } from '../article/repository'
import { errNotFound as storyErrNotFound, type StoryRepository } from '../story/repository'
import { errSourceLocked, newPost, normalisePost, validatePost, type Post } from './model'
import type { PostRepository } from './repository'

function domainError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code })
}

/** Returned when the story or article a post points at does not exist. */
export const errSourceNotFound = domainError('errSourceNotFound', 'post source not found')

/** Port for post use cases. */
export interface PostService {
  create(post: Post): Promise<Post>
  get(id: string): Promise<Post>
  list(): Promise<Post[]>
  update(post: Post): Promise<Post>
  delete(id: string): Promise<void>
}

/**
 * Creates a PostService backed by the given repositories. The story and
 * article repositories verify the optional source on create and whenever an
 * update changes it.
 */
export function newPostService(
  repo: PostRepository,
  storyRepo: StoryRepository,
  articleRepo: ArticleRepository
): PostService {
  const ensureSourceExists = async (post: Post): Promise<void> => {
    if (post.storyID !== null) {
      try {
        await storyRepo.get(post.storyID)
      } catch (error) {
        if (error === storyErrNotFound) {
          throw errSourceNotFound
        }
        throw error
      }
    }

    if (post.articleID !== null) {
      try {
        await articleRepo.get(post.articleID)
      } catch (error) {
        if (error === articleErrNotFound) {
          throw errSourceNotFound
        }
        throw error
      }
    }
  }

  return {
    async create(post) {
      const created = newPost(post.topic, post.text, post.storyID, post.articleID)
      await ensureSourceExists(created)
      return repo.create(created)
    },
    async get(id) {
      return repo.get(id)
    },
    async list() {
      return repo.list()
    },
    async update(post) {
      const normalised = normalisePost(post)
      validatePost(normalised)

      const stored = await repo.get(normalised.id)
      const sourceChanged =
        normalised.storyID !== stored.storyID || normalised.articleID !== stored.articleID

      if (sourceChanged && stored.state !== 'pending') {
        throw errSourceLocked
      }
      if (sourceChanged) {
        await ensureSourceExists(normalised)
      }

      return repo.update(normalised)
    },
    async delete(id) {
      return repo.delete(id)
    }
  }
}
