import { describe, expect, it } from '@jest/globals'
import {
  countCharacters,
  countWords,
  excerpt,
  formatRelativeDate,
  readingTimeMinutes
} from './format'

const now = new Date('2024-10-25T15:00:00')

describe('formatRelativeDate', () => {
  it('treats the last minute as just now', () => {
    expect(formatRelativeDate('2024-10-25T14:59:30', now)).toBe('Just now')
  })

  it('shows the time of day for anything else today', () => {
    expect(formatRelativeDate('2024-10-25T14:22:00', now)).toBe('14:22')
  })

  it('shows yesterday as a word', () => {
    expect(formatRelativeDate('2024-10-24T23:10:00', now)).toBe('Yesterday')
  })

  it('shows month and day earlier in the same year', () => {
    expect(formatRelativeDate('2024-03-09T08:00:00', now)).toBe('Mar 9')
  })

  it('adds the year when it differs', () => {
    expect(formatRelativeDate('2023-10-24T08:00:00', now)).toBe('Oct 24, 2023')
  })

  it('treats a future timestamp as just now', () => {
    expect(formatRelativeDate('2024-10-25T15:00:30', now)).toBe('Just now')
  })

  it('returns an empty string for an unparseable timestamp', () => {
    expect(formatRelativeDate('not-a-date', now)).toBe('')
  })
})

describe('countWords', () => {
  it('counts words separated by any whitespace', () => {
    expect(countWords('The article text.')).toBe(3)
    expect(countWords('  one\n\t two  ')).toBe(2)
  })

  it('counts nothing for an empty document', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n  ')).toBe(0)
  })
})

describe('countCharacters', () => {
  it('counts every character including whitespace', () => {
    expect(countCharacters('a b')).toBe(3)
    expect(countCharacters('')).toBe(0)
  })
})

describe('readingTimeMinutes', () => {
  it('takes a minute for up to two hundred words', () => {
    expect(readingTimeMinutes(1)).toBe(1)
    expect(readingTimeMinutes(200)).toBe(1)
  })

  it('rounds up beyond that', () => {
    expect(readingTimeMinutes(201)).toBe(2)
  })

  it('takes no time for an empty document', () => {
    expect(readingTimeMinutes(0)).toBe(0)
  })
})

describe('excerpt', () => {
  it('collapses whitespace into single spaces', () => {
    expect(excerpt('  first\n\n second\tthird  ')).toBe('first second third')
  })

  it('returns short text unchanged', () => {
    expect(excerpt('short text', 240)).toBe('short text')
  })

  it('truncates long text with an ellipsis', () => {
    const result = excerpt('a'.repeat(250), 240)

    expect(result).toBe(`${'a'.repeat(240)}…`)
  })

  it('does not leave a trailing space before the ellipsis', () => {
    const result = excerpt(`${'a'.repeat(239)} bbbbb`, 240)

    expect(result).toBe(`${'a'.repeat(239)}…`)
  })
})
