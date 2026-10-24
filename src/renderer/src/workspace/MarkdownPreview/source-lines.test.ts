import { describe, expect, it } from '@jest/globals'
import {
  firstCodeLine,
  nearestMarkerLine,
  splitTextIntoSourceLines,
  trimLeadingMarkdownSpace
} from './source-lines'

describe('splitTextIntoSourceLines', () => {
  it('splits on a line feed and numbers the lines from the node start', () => {
    expect(splitTextIntoSourceLines('a\nb', 3)).toEqual([
      { line: 3, value: 'a' },
      { line: 4, value: 'b' }
    ])
  })

  it('treats CRLF as one line ending', () => {
    expect(splitTextIntoSourceLines('a\r\nb', 1)).toEqual([
      { line: 1, value: 'a' },
      { line: 2, value: 'b' }
    ])
  })

  it('treats a lone carriage return as a line ending', () => {
    expect(splitTextIntoSourceLines('a\rb', 7)).toEqual([
      { line: 7, value: 'a' },
      { line: 8, value: 'b' }
    ])
  })

  it('returns a single segment for text without line endings', () => {
    expect(splitTextIntoSourceLines('only one', 5)).toEqual([{ line: 5, value: 'only one' }])
  })

  it('trims leading markdown space after a line ending, like mdast-util-to-hast', () => {
    expect(splitTextIntoSourceLines('a\n  b', 1)).toEqual([
      { line: 1, value: 'a' },
      { line: 2, value: 'b' }
    ])
    expect(splitTextIntoSourceLines('a\n\t\tb', 1)).toEqual([
      { line: 1, value: 'a' },
      { line: 2, value: 'b' }
    ])
  })

  it('keeps the leading space of the first segment untouched', () => {
    expect(splitTextIntoSourceLines(' a\nb', 1)).toEqual([
      { line: 1, value: ' a' },
      { line: 2, value: 'b' }
    ])
  })

  it('keeps an empty segment for a trailing line ending', () => {
    expect(splitTextIntoSourceLines('a\n', 1)).toEqual([
      { line: 1, value: 'a' },
      { line: 2, value: '' }
    ])
  })
})

describe('trimLeadingMarkdownSpace', () => {
  it('removes spaces and tabs only from the start', () => {
    expect(trimLeadingMarkdownSpace(' \t x ')).toBe('x ')
    expect(trimLeadingMarkdownSpace('x  ')).toBe('x  ')
    expect(trimLeadingMarkdownSpace('')).toBe('')
  })
})

describe('firstCodeLine', () => {
  it('skips the opening fence of a closed fenced block', () => {
    expect(firstCodeLine(26, 30, 2)).toBe(27)
  })

  it('skips the opening fence of an unclosed fenced block', () => {
    expect(firstCodeLine(26, 28, 2)).toBe(27)
  })

  it('skips the opening fence when the block has several content lines', () => {
    expect(firstCodeLine(26, 30, 3)).toBe(27)
    expect(firstCodeLine(26, 29, 3)).toBe(27)
  })

  it('skips the opening fence when the block has a single content line', () => {
    expect(firstCodeLine(26, 28, 1)).toBe(27)
    expect(firstCodeLine(26, 27, 1)).toBe(27)
  })

  it('does not skip anything for an indented block', () => {
    expect(firstCodeLine(32, 33, 2)).toBe(32)
    expect(firstCodeLine(32, 34, 3)).toBe(32)
  })

  it('does not skip anything for a single-line indented block', () => {
    expect(firstCodeLine(9, 9, 1)).toBe(9)
  })
})

describe('nearestMarkerLine', () => {
  it('returns the only marker of a block', () => {
    expect(nearestMarkerLine([8], 9)).toBe(8)
  })

  it('prefers the previous line when two markers are equally near', () => {
    expect(nearestMarkerLine([35, 37, 38], 36)).toBe(35)
  })

  it('snaps to the first marker above the block', () => {
    expect(nearestMarkerLine([27, 28, 29], 26)).toBe(27)
  })

  it('snaps to the last marker below the block', () => {
    expect(nearestMarkerLine([27, 28, 29], 30)).toBe(29)
  })

  it('returns null when the block has no markers', () => {
    expect(nearestMarkerLine([], 40)).toBeNull()
  })
})
