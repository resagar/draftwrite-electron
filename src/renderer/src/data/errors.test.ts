import { describe, expect, it } from '@jest/globals'
import { describeError } from './errors'

describe('describeError', () => {
  it('explains a duplicated story topic', () => {
    expect(describeError(new Error('story topic already taken'))).toBe(
      'Another story already uses that topic.'
    )
  })

  it('explains a duplicated article title within a story', () => {
    expect(describeError(new Error('article title already taken in this story'))).toBe(
      'This story already has an article with that title.'
    )
  })

  it('explains a rejected story reassignment', () => {
    expect(describeError(new Error('article story id is immutable'))).toBe(
      'An article cannot be moved to another story.'
    )
  })

  it('explains a missing required field', () => {
    expect(describeError(new Error('story topic is required'))).toBe('A topic is required.')
    expect(describeError(new Error('article story id required'))).toBe('An article needs a story.')
  })

  it('explains a field that is too long', () => {
    expect(describeError(new Error('article subtitle too long'))).toBe(
      'One of the fields is too long (255 characters at most).'
    )
  })

  it('explains a missing record', () => {
    expect(describeError(new Error('article not found'))).toBe('That item no longer exists.')
  })

  it('explains an article whose story is gone', () => {
    expect(describeError(new Error('story not found'))).toBe(
      'The story this article belongs to no longer exists.'
    )
  })

  it('accepts a plain string rejection', () => {
    expect(describeError('article not found')).toBe('That item no longer exists.')
  })

  it('falls back for anything it does not recognise', () => {
    expect(describeError(new Error('connection reset'))).toBe(
      'Something went wrong. Please try again.'
    )
  })
})
