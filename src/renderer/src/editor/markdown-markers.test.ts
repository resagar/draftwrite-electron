import { describe, expect, it } from '@jest/globals'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { highlightTree, tagHighlighter, tags } from '@lezer/highlight'
import { markdownMarkerStyles, markdownMarkerTags } from './markdown-markers'

const parser = markdown({ base: markdownLanguage, extensions: markdownMarkerStyles }).language
  .parser
const highlighter = tagHighlighter([
  { tag: tags.heading1, class: 'heading-1' },
  { tag: tags.heading2, class: 'heading-2' },
  { tag: tags.heading3, class: 'heading-3' },
  { tag: tags.heading4, class: 'heading-4' },
  { tag: tags.heading5, class: 'heading-5' },
  { tag: tags.heading6, class: 'heading-6' },
  { tag: markdownMarkerTags.heading, class: 'generic-heading-marker' }
])

describe('heading level highlighting', () => {
  it.each([1, 2, 3, 4, 5, 6])('gives H%i text and both markers the same level', (level) => {
    const marker = '#'.repeat(level)
    const text = `${marker} Heading ${level} ${marker}`
    const spans: Array<{ text: string; className: string }> = []
    highlightTree(parser.parse(text), highlighter, (from, to, className) => {
      spans.push({ text: text.slice(from, to), className })
    })

    expect(spans.map((span) => span.text).join('')).toBe(text)
    expect(new Set(spans.flatMap((span) => span.className.split(' ')))).toEqual(
      new Set([`heading-${level}`])
    )
  })

  it.each([
    [1, '==='],
    [2, '---']
  ] as const)('gives Setext H%i text and underline the same level', (level, marker) => {
    const text = `Heading\n${marker}`
    const spans: Array<{ text: string; className: string }> = []
    highlightTree(parser.parse(text), highlighter, (from, to, className) => {
      spans.push({ text: text.slice(from, to), className })
    })

    expect(spans.map((span) => span.text).join('')).toBe(text)
    expect(new Set(spans.flatMap((span) => span.className.split(' ')))).toEqual(
      new Set([`heading-${level}`])
    )
  })
})
