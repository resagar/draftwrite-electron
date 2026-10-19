import type { Article } from '../../article/model'
import type { Story } from '../../story/model'

/**
 * Runtime narrowing for the IPC boundary: TypeScript types do not validate
 * payloads coming from the renderer, so every constructor checks only the
 * fields its use case reads. Invalid shapes fail with a plain Error, which the
 * handlers translate to `errUnexpected`. Timestamps are ignored on purpose.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Narrows a payload to a plain object or fails the boundary. */
export function expectRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error('invalid payload: expected an object')
  }
  return value
}

/** Narrows a payload field to a string or fails the boundary. */
export function expectString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`invalid payload: ${field} must be a string`)
  }
  return value
}

/** Narrows a payload field to an array of strings or fails the boundary. */
export function expectStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`invalid payload: ${field} must be an array of strings`)
  }
  const items: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new Error(`invalid payload: ${field} must be an array of strings`)
    }
    items.push(item)
  }
  return items
}

/** Builds the story create input, validating the fields the use case reads. */
export function parseStoryCreatePayload(payload: unknown): Story {
  const record = expectRecord(payload)
  return {
    id: '',
    topic: expectString(record.topic, 'topic'),
    titles: expectStringArray(record.titles, 'titles'),
    tags: expectStringArray(record.tags, 'tags'),
    text: expectString(record.text, 'text'),
    createdAt: '',
    updatedAt: ''
  }
}

/** Builds the story update input: the create fields plus the mandatory id. */
export function parseStoryUpdatePayload(payload: unknown): Story {
  const record = expectRecord(payload)
  return { ...parseStoryCreatePayload(record), id: expectString(record.id, 'id') }
}

/** Builds the article create input, validating the fields the use case reads. */
export function parseArticleCreatePayload(payload: unknown): Article {
  const record = expectRecord(payload)
  return {
    id: '',
    storyID: expectString(record.storyID, 'storyID'),
    title: expectString(record.title, 'title'),
    subtitle: expectString(record.subtitle, 'subtitle'),
    target: expectString(record.target, 'target'),
    text: expectString(record.text, 'text'),
    createdAt: '',
    updatedAt: ''
  }
}

/** Builds the article update input: the create fields plus the mandatory id. */
export function parseArticleUpdatePayload(payload: unknown): Article {
  const record = expectRecord(payload)
  return { ...parseArticleCreatePayload(record), id: expectString(record.id, 'id') }
}
