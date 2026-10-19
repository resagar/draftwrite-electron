import { describe, expect, it } from '@jest/globals'
import {
  errStoryIDRequired,
  errSubtitleTooLong,
  errTargetTooLong,
  errTitleRequired,
  errTitleTooLong,
  newArticle,
  validateArticle,
  type Article
} from './model'

const emptyArticle: Article = {
  id: '',
  storyID: '',
  title: '',
  subtitle: '',
  target: '',
  text: '',
  createdAt: '',
  updatedAt: ''
}

const validArticle: Article = {
  ...emptyArticle,
  storyID: 'story-id-1',
  title: 'Title',
  subtitle: 'Subtitle',
  target: 'Target',
  text: 'Text'
}

/** Runs `fn` and returns the thrown value so sentinels can be compared by identity. */
function captureError(fn: () => unknown): unknown {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('expected the function to throw')
}

describe('newArticle', () => {
  it('creates an article from the given values', () => {
    const article = newArticle('story-id-1', 'Title', 'Subtitle', 'Target', 'Text')

    expect(article.id).not.toBe('')
    expect(article.storyID).toBe('story-id-1')
    expect(article.title).toBe('Title')
    expect(article.subtitle).toBe('Subtitle')
    expect(article.target).toBe('Target')
    expect(article.text).toBe('Text')
  })

  it('generates unique ids', () => {
    const first = newArticle('story-id-1', 'Title', 'Subtitle', 'Target', 'Text')
    const second = newArticle('story-id-1', 'Title 2', 'Subtitle 2', 'Target 2', 'Text 2')

    expect(first.id).not.toBe(second.id)
  })

  it('only requires a story and a title', () => {
    const article = newArticle('story-id-1', 'Title', '', '', '')

    expect(article.id).not.toBe('')
    expect(article.storyID).toBe('story-id-1')
    expect(article.title).toBe('Title')
    expect(article.subtitle).toBe('')
    expect(article.target).toBe('')
    expect(article.text).toBe('')
  })

  it('trims the values', () => {
    const article = newArticle(
      '  story-id-1  ',
      '  Title  ',
      '  Subtitle  ',
      '  Target  ',
      '  Text  '
    )

    expect(article.storyID).toBe('story-id-1')
    expect(article.title).toBe('Title')
    expect(article.subtitle).toBe('Subtitle')
    expect(article.target).toBe('Target')
    expect(article.text).toBe('Text')
  })

  it('rejects invalid values', () => {
    const long = 'a'.repeat(256)

    // Go subcases: story id required/blank, title required/blank/too long,
    // subtitle too long and target too long.
    expect(captureError(() => newArticle('', 'Title', 'Subtitle', 'Target', 'Text'))).toBe(
      errStoryIDRequired
    )
    expect(captureError(() => newArticle('   ', 'Title', 'Subtitle', 'Target', 'Text'))).toBe(
      errStoryIDRequired
    )
    expect(captureError(() => newArticle('story-id-1', '', 'Subtitle', 'Target', 'Text'))).toBe(
      errTitleRequired
    )
    expect(captureError(() => newArticle('story-id-1', '   ', 'Subtitle', 'Target', 'Text'))).toBe(
      errTitleRequired
    )
    expect(captureError(() => newArticle('story-id-1', long, 'Subtitle', 'Target', 'Text'))).toBe(
      errTitleTooLong
    )
    expect(captureError(() => newArticle('story-id-1', 'Title', long, 'Target', 'Text'))).toBe(
      errSubtitleTooLong
    )
    expect(captureError(() => newArticle('story-id-1', 'Title', 'Subtitle', long, 'Text'))).toBe(
      errTargetTooLong
    )
  })
})

describe('validateArticle', () => {
  it('validates the entity invariants', () => {
    const long = 'a'.repeat(256)

    // Go base case plus subcases: story id required/blank, title
    // required/blank/too long, subtitle too long and target too long.
    expect(() => validateArticle(validArticle)).not.toThrow()
    expect(captureError(() => validateArticle({ ...validArticle, storyID: '' }))).toBe(
      errStoryIDRequired
    )
    expect(captureError(() => validateArticle({ ...validArticle, storyID: '   ' }))).toBe(
      errStoryIDRequired
    )
    expect(captureError(() => validateArticle({ ...validArticle, title: '' }))).toBe(
      errTitleRequired
    )
    expect(captureError(() => validateArticle({ ...validArticle, title: '   ' }))).toBe(
      errTitleRequired
    )
    expect(captureError(() => validateArticle({ ...validArticle, title: long }))).toBe(
      errTitleTooLong
    )
    expect(captureError(() => validateArticle({ ...validArticle, subtitle: long }))).toBe(
      errSubtitleTooLong
    )
    expect(captureError(() => validateArticle({ ...validArticle, target: long }))).toBe(
      errTargetTooLong
    )
  })

  it('measures the field limit in UTF-8 bytes', () => {
    // Regression: the Go model measures with len() (UTF-8 bytes), so a
    // multibyte string hits the limit sooner than with UTF-16 code units.
    const withinLimit = 'é'.repeat(127) // 254 UTF-8 bytes
    const overLimit = 'é'.repeat(128) // 256 UTF-8 bytes

    expect(() => validateArticle({ ...validArticle, title: withinLimit })).not.toThrow()
    expect(captureError(() => validateArticle({ ...validArticle, title: overLimit }))).toBe(
      errTitleTooLong
    )
    expect(() => validateArticle({ ...validArticle, subtitle: withinLimit })).not.toThrow()
    expect(captureError(() => validateArticle({ ...validArticle, subtitle: overLimit }))).toBe(
      errSubtitleTooLong
    )
  })
})
