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
  /** ISO 8601 date the post is meant to go out; only with `scheduled`. */
  scheduledAt: string | null
  /** Source story; exclusive with `articleID`. */
  storyID: string | null
  /** Source article; exclusive with `storyID`. */
  articleID: string | null
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

/** Returned when the scheduled date is not a valid ISO 8601 date. */
export const errScheduledAtInvalid = domainError(
  'errScheduledAtInvalid',
  'post scheduled at is not a valid ISO 8601 date'
)

/** Returned when a post points at a story and an article at the same time. */
export const errSourceAmbiguous = domainError(
  'errSourceAmbiguous',
  'post source must be a story or an article, not both'
)

/** Returned when an update tries to change the source of a post that is not pending. */
export const errSourceLocked = domainError(
  'errSourceLocked',
  'post source can only change while pending'
)

/**
 * Creates a post in `pending`. It generates the ID and validates the entity
 * invariants; the timestamps come from the database on persist. The state is
 * not taken from the caller: every post starts pending.
 */
export function newPost(
  topic: string,
  text: string,
  storyID: string | null,
  articleID: string | null
): Post {
  const post = normalisePost({
    id: '',
    topic,
    text,
    state: 'pending',
    scheduledAt: null,
    storyID,
    articleID,
    createdAt: '',
    updatedAt: ''
  })
  validatePost(post)
  return { ...post, id: randomUUID() }
}

/** Returns a copy with the values trimmed and the date only kept while scheduled. */
export function normalisePost(post: Post): Post {
  return {
    ...post,
    topic: post.topic.trim(),
    text: post.text.trim(),
    scheduledAt: post.state === 'scheduled' ? blankToNull(post.scheduledAt) : null,
    storyID: blankToNull(post.storyID),
    articleID: blankToNull(post.articleID)
  }
}

/** Trims the date and treats an empty string as absence. */
function blankToNull(value: string | null): string | null {
  if (value === null) {
    return null
  }

  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Checks the domain invariants: only the topic is required, and a blank topic
 * counts as missing; a scheduled date, when present, must be a valid ISO 8601
 * date. It does not generate an ID, so both the constructor and the update use
 * case can enforce the same rules.
 */
export function validatePost(post: Post): void {
  if (post.topic.trim() === '') {
    throw errTopicRequired
  }

  if (post.scheduledAt !== null && Number.isNaN(Date.parse(post.scheduledAt))) {
    throw errScheduledAtInvalid
  }

  if (post.storyID !== null && post.articleID !== null) {
    throw errSourceAmbiguous
  }
}
