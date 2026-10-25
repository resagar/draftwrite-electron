import { randomUUID } from 'node:crypto'

/** Editorial state of a post. */
export type PostState = 'pending' | 'scheduled' | 'published'

/** Every state a post can hold, in editorial order. */
export const postStates: readonly PostState[] = ['pending', 'scheduled', 'published']

/** Domain entity for a short publication for social media. */
export interface Post {
  id: string
  topic: string
  text: string
  state: PostState
  /** ISO 8601 timestamp; empty until the post is persisted. */
  createdAt: string
  /** ISO 8601 timestamp; empty until the post is persisted. */
  updatedAt: string
}

function domainError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code })
}

/** Returned when the post has no topic to identify it. */
export const errTopicRequired = domainError('errTopicRequired', 'post topic required')

/**
 * Creates a post in `pending`. It generates the ID and validates the entity
 * invariants; the timestamps come from the database on persist. The state is
 * not taken from the caller: every post starts pending.
 */
export function newPost(topic: string, text: string): Post {
  const post = normalisePost({
    id: '',
    topic,
    text,
    state: 'pending',
    createdAt: '',
    updatedAt: ''
  })
  validatePost(post)
  return { ...post, id: randomUUID() }
}

/** Returns a copy with the topic and the text trimmed, so what gets stored is what was validated. */
export function normalisePost(post: Post): Post {
  return {
    ...post,
    topic: post.topic.trim(),
    text: post.text.trim()
  }
}

/**
 * Checks the domain invariants: only the topic is required, and a blank topic
 * counts as missing. It does not generate an ID, so both the constructor and
 * the update use case can enforce the same rules.
 */
export function validatePost(post: Post): void {
  if (post.topic.trim() === '') {
    throw errTopicRequired
  }
}
