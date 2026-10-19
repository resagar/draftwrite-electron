import { randomUUID } from 'node:crypto'

/** Domain entity for a story. */
export interface Story {
  id: string
  topic: string
  titles: string[]
  tags: string[]
  text: string
  /** ISO 8601 timestamp; empty until the story is persisted. */
  createdAt: string
  /** ISO 8601 timestamp; empty until the story is persisted. */
  updatedAt: string
}

/** Returned when a story has no topic to identify it. */
export const errTopicRequired = Object.assign(new Error('story topic is required'), {
  code: 'errTopicRequired'
})

/**
 * Creates a story with a generated ID. Only the topic is required: titles,
 * tags and text are optional and default to empty (ADR-0009).
 */
export function newStory(topic: string, titles: string[], tags: string[], text: string): Story {
  const story = normaliseStory({
    id: '',
    topic,
    titles,
    tags,
    text,
    createdAt: '',
    updatedAt: ''
  })
  validateStory(story)
  return { ...story, id: randomUUID() }
}

/**
 * Returns a copy with the topic, the text and every list entry trimmed and the
 * blanks dropped, so what gets stored is what was validated.
 */
export function normaliseStory(story: Story): Story {
  return {
    ...story,
    topic: story.topic.trim(),
    text: story.text.trim(),
    titles: normaliseList(story.titles),
    tags: normaliseList(story.tags)
  }
}

/**
 * Checks the domain invariants: only the topic is required, and a blank topic
 * counts as missing. It does not generate an ID, so both the constructor and
 * the update use case can enforce the same rules.
 */
export function validateStory(story: Story): void {
  if (story.topic.trim() === '') {
    throw errTopicRequired
  }
}

/** Trims every entry, drops the blanks and never returns undefined. */
function normaliseList(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value !== '')
}
