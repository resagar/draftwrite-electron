import { newPost, normalisePost, validatePost, type Post } from './model'
import type { PostRepository } from './repository'

/** Port for post use cases. */
export interface PostService {
  create(post: Post): Promise<Post>
  get(id: string): Promise<Post>
  list(): Promise<Post[]>
  update(post: Post): Promise<Post>
}

/**
 * Creates a PostService backed by the given repository. A post is always
 * created pending, so the create input only carries the fields a writer can
 * set; the rest is completed by the model and the database.
 */
export function newPostService(repo: PostRepository): PostService {
  return {
    async create(post) {
      return repo.create(newPost(post.topic, post.text))
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
      return repo.update(normalised)
    }
  }
}
