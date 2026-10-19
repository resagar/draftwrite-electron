import { randomUUID } from 'node:crypto'

/** Domain entity for an article belonging to a story. */
export interface Article {
  id: string
  storyID: string
  title: string
  subtitle: string
  target: string
  text: string
  /** ISO 8601 timestamp; empty until the article is persisted. */
  createdAt: string
  /** ISO 8601 timestamp; empty until the article is persisted. */
  updatedAt: string
}

/** Maximum length in UTF-8 bytes of the title, subtitle and target. */
const maxFieldLength = 255

function domainError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code })
}

/** Returned when the article has no story. */
export const errStoryIDRequired = domainError('errStoryIDRequired', 'article story id required')

/** Returned when the article title is empty. */
export const errTitleRequired = domainError('errTitleRequired', 'article title required')

/** Returned when the article title exceeds maxFieldLength. */
export const errTitleTooLong = domainError('errTitleTooLong', 'article title too long')

/** Returned when the article subtitle exceeds maxFieldLength. */
export const errSubtitleTooLong = domainError('errSubtitleTooLong', 'article subtitle too long')

/** Returned when the article target exceeds maxFieldLength. */
export const errTargetTooLong = domainError('errTargetTooLong', 'article target too long')

/** Returned when an update tries to reassign the article to a different story. */
export const errStoryIDImmutable = domainError(
  'errStoryIDImmutable',
  'article story id is immutable'
)

/**
 * Creates an article belonging to the story with the given ID. Only the story
 * and the title are required: subtitle, target and text are optional and
 * default to empty (ADR-0009). It generates the article ID and validates the
 * entity invariants. Timestamps come from the database on persist.
 */
export function newArticle(
  storyID: string,
  title: string,
  subtitle: string,
  target: string,
  text: string
): Article {
  const article = normaliseArticle({
    id: '',
    storyID,
    title,
    subtitle,
    target,
    text,
    createdAt: '',
    updatedAt: ''
  })
  validateArticle(article)
  return { ...article, id: randomUUID() }
}

/** Returns a copy with every field trimmed, so what gets stored is what was validated. */
export function normaliseArticle(article: Article): Article {
  return {
    ...article,
    storyID: article.storyID.trim(),
    title: article.title.trim(),
    subtitle: article.subtitle.trim(),
    target: article.target.trim(),
    text: article.text.trim()
  }
}

/**
 * Checks the entity invariants: story id and title are required, and blank
 * counts as missing; title, subtitle and target are at most maxFieldLength
 * bytes long. It does not generate an ID, so both the constructor and the
 * update use case can enforce the same rules.
 */
export function validateArticle(article: Article): void {
  const storyID = article.storyID.trim()
  const title = article.title.trim()

  if (storyID === '') {
    throw errStoryIDRequired
  }
  if (title === '') {
    throw errTitleRequired
  }
  if (utf8Length(title) > maxFieldLength) {
    throw errTitleTooLong
  }
  if (utf8Length(article.subtitle.trim()) > maxFieldLength) {
    throw errSubtitleTooLong
  }
  if (utf8Length(article.target.trim()) > maxFieldLength) {
    throw errTargetTooLong
  }
}

/**
 * Length in UTF-8 bytes: the Go model measures with len(), so multibyte
 * strings count more than one and the limit stays byte for byte.
 */
function utf8Length(value: string): number {
  return Buffer.byteLength(value, 'utf8')
}
