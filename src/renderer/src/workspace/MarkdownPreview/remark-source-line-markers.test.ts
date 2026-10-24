import { describe, expect, it } from '@jest/globals'
import { remarkSourceLineMarkers, type MdNode } from './remark-source-line-markers'

/** A node handled by `mdast-util-to-hast` as an empty `<span data-source-line>`. */
const marker = (line: number): MdNode => ({
  type: 'text',
  value: '',
  data: { hName: 'span', hProperties: { 'data-source-line': line } }
})

const text = (value: string, startLine: number, endLine = startLine): MdNode => ({
  type: 'text',
  value,
  position: { start: { line: startLine }, end: { line: endLine } }
})

const paragraph = (...children: MdNode[]): MdNode => ({ type: 'paragraph', children })

const document = (...children: MdNode[]): MdNode => ({ type: 'root', children })

const transform = (tree: MdNode): MdNode => {
  remarkSourceLineMarkers()(tree)
  return tree
}

describe('remarkSourceLineMarkers', () => {
  it('puts one marker before a single-line text node and leaves it untouched', () => {
    const tree = transform(document(paragraph(text('hello', 1))))

    expect(tree.children?.[0]?.children).toEqual([marker(1), text('hello', 1)])
  })

  it('splits a multi-line text node and emits a break between the segments', () => {
    const tree = transform(document(paragraph(text('first\nsecond', 3, 4))))

    expect(tree.children?.[0]?.children).toEqual([
      marker(3),
      text('first', 3, 4),
      { type: 'break' },
      marker(4),
      text('second', 3, 4)
    ])
  })

  it('trims the leading markdown space of every segment after the first', () => {
    const tree = transform(document(paragraph(text('one\n  two\n\tthree', 1, 3))))

    expect(tree.children?.[0]?.children).toEqual([
      marker(1),
      text('one', 1, 3),
      { type: 'break' },
      marker(2),
      text('two', 1, 3),
      { type: 'break' },
      marker(3),
      text('three', 1, 3)
    ])
  })

  it('marks a line once even when it has several text nodes', () => {
    const tree = transform(
      document(
        paragraph(text('a ', 1), {
          type: 'emphasis',
          children: [text('b', 1)]
        })
      )
    )

    expect(tree.children?.[0]?.children).toEqual([
      marker(1),
      text('a ', 1),
      { type: 'emphasis', children: [text('b', 1)] }
    ])
  })

  it('marks the next line inside the inline that crosses the line ending', () => {
    const tree = transform(
      document(
        paragraph(text('second line with ', 4), {
          type: 'strong',
          children: [text('bold\nacross lines', 4, 5)]
        })
      )
    )

    expect(tree.children?.[0]?.children).toEqual([
      marker(4),
      text('second line with ', 4),
      {
        type: 'strong',
        children: [text('bold', 4, 5), { type: 'break' }, marker(5), text('across lines', 4, 5)]
      }
    ])
  })

  it('trims the leading space of a text node that follows a break', () => {
    const tree = transform(document(paragraph(text('a', 1), { type: 'break' }, text('  b', 2))))

    expect(tree.children?.[0]?.children).toEqual([
      marker(1),
      text('a', 1),
      { type: 'break' },
      marker(2),
      text('b', 2)
    ])
  })

  it('leaves a text node without position untouched and emits no marker', () => {
    const withoutPosition: MdNode = { type: 'text', value: 'loose' }
    const tree = transform(document(paragraph(withoutPosition)))

    expect(tree.children?.[0]?.children).toEqual([withoutPosition])
  })

  it('keeps nodes it does not annotate, in document order', () => {
    const inlineCode: MdNode = { type: 'inlineCode', value: 'code', position: undefined }
    const tree = transform(
      document(paragraph(text('see ', 5), inlineCode, text('now', 5)), {
        type: 'thematicBreak',
        position: { start: { line: 7 }, end: { line: 7 } }
      })
    )

    expect(tree.children?.[0]?.children).toEqual([
      marker(5),
      text('see ', 5),
      inlineCode,
      text('now', 5)
    ])
    expect(tree.children?.[1]).toEqual({
      type: 'thematicBreak',
      position: { start: { line: 7 }, end: { line: 7 } }
    })
  })

  it('numbers each line of a list item independently', () => {
    const tree = transform(
      document({
        type: 'list',
        children: [
          { type: 'listItem', children: [paragraph(text('one', 1))] },
          { type: 'listItem', children: [paragraph(text('two\ncontinued', 2, 3))] }
        ]
      })
    )

    const [first, second] = tree.children?.[0]?.children ?? []

    expect(first?.children?.[0]?.children).toEqual([marker(1), text('one', 1)])
    expect(second?.children?.[0]?.children).toEqual([
      marker(2),
      text('two', 2, 3),
      { type: 'break' },
      marker(3),
      text('continued', 2, 3)
    ])
  })
})
