import { describe, expect, it } from '@jest/globals'
import { render, screen, within } from '@testing-library/react'
import { MarkdownPreview } from './MarkdownPreview'

const renderPreview = (markdown: string): HTMLElement => {
  render(<MarkdownPreview markdown={markdown} />)
  return within(screen.getByRole('region', { name: 'Preview' })).getByRole('article')
}

const markers = (element: Element): Element[] =>
  Array.from(element.querySelectorAll('[data-source-line]'))

const markerLines = (element: Element): (string | null)[] =>
  markers(element).map((marker) => marker.getAttribute('data-source-line'))

describe('MarkdownPreview source line markers', () => {
  it('marks the heading line and anchors the heading block', () => {
    const article = renderPreview('# Calm')
    const heading = article.querySelector('h1')

    expect(heading?.getAttribute('data-source-start-line')).toBe('1')
    expect(heading?.getAttribute('data-source-end-line')).toBe('1')
    expect(heading?.firstChild).toBe(heading?.querySelector('[data-source-line="1"]'))
  })

  it('marks every line of a paragraph and keeps the break between them', () => {
    const article = renderPreview('First line\nsecond line with **sturdy**')
    const paragraph = article.querySelector('p')

    expect(paragraph?.getAttribute('data-source-start-line')).toBe('1')
    expect(paragraph?.getAttribute('data-source-end-line')).toBe('2')
    expect(markerLines(paragraph!)).toEqual(['1', '2'])
    expect(Array.from(paragraph?.children ?? []).map((child) => child.tagName)).toEqual([
      'SPAN',
      'BR',
      'SPAN',
      'STRONG'
    ])
  })

  it('renders the markers as empty spans with no style that would hide them', () => {
    const article = renderPreview('# Calm\n\nA line\nanother line')
    const all = markers(article)

    expect(all.length).toBe(3)

    for (const marker of all) {
      expect(marker.tagName).toBe('SPAN')
      expect(marker.textContent).toBe('')
      expect(marker.getAttribute('class')).toBeNull()
      expect(marker.getAttribute('style')).toBeNull()
      expect((marker as HTMLElement).style.display).toBe('')
      expect((marker as HTMLElement).style.visibility).toBe('')
    }
  })

  it('keeps the text queries of the existing tests working', () => {
    const article = renderPreview('**sturdy** and **world**')

    expect(within(article).getByText('sturdy').tagName).toBe('STRONG')
    expect(within(article).getByText('world').tagName).toBe('STRONG')
  })

  it('anchors the table wrapper and each row, and never marks the delimiter row', () => {
    const article = renderPreview('| a | b |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |')
    const wrapper = article.querySelector('div')
    const rows = Array.from(article.querySelectorAll('tr'))

    expect(wrapper?.getAttribute('data-source-start-line')).toBe('1')
    expect(wrapper?.getAttribute('data-source-end-line')).toBe('4')
    expect(rows.map((row) => row.getAttribute('data-source-start-line'))).toEqual(['1', '3', '4'])
    expect(markerLines(article)).toEqual(['1', '3', '4'])
    expect(article.querySelector('[data-source-line="2"]')).toBeNull()
  })

  it('marks every code line, including the empty one, and keeps the code text', () => {
    const article = renderPreview('```js\nconst a = 1\n\nconst b = 2\n```')
    const pre = article.querySelector('pre')
    const code = article.querySelector('pre code')

    expect(pre?.getAttribute('data-source-start-line')).toBe('1')
    expect(pre?.getAttribute('data-source-end-line')).toBe('5')
    expect(markerLines(code!)).toEqual(['2', '3', '4'])
    expect(markers(code!).map((marker) => marker.textContent)).toEqual([
      'const a = 1',
      '',
      'const b = 2'
    ])
    expect(code?.textContent).toBe('const a = 1\n\nconst b = 2\n')
  })

  it('marks the lines of an indented code block from its first line', () => {
    const article = renderPreview('    indented one\n    indented two')
    const code = article.querySelector('pre code')

    expect(markerLines(code!)).toEqual(['1', '2'])
    expect(code?.textContent).toBe('indented one\nindented two\n')
  })

  it('keeps the original line of a footnote definition', () => {
    const article = renderPreview('Text with a footnote[^1]\n\n[^1]: footnote body\n    continued')
    const body = article.querySelector('[data-footnotes]')

    expect(markerLines(article)).toEqual(['1', '3', '4'])
    expect(body?.querySelector('[data-source-line="3"]')).not.toBeNull()
    expect(body?.querySelector('[data-source-line="4"]')).not.toBeNull()
  })

  it('anchors a thematic break and a paragraph holding only an image', () => {
    const article = renderPreview('---\n\n![alt text](img.png)')
    const hr = article.querySelector('hr')
    const paragraph = article.querySelector('p')

    expect(hr?.getAttribute('data-source-start-line')).toBe('1')
    expect(hr?.getAttribute('data-source-end-line')).toBe('1')
    expect(paragraph?.getAttribute('data-source-start-line')).toBe('3')
    expect(markers(article)).toEqual([])
  })

  it('anchors list blocks and items, marking each item line', () => {
    const article = renderPreview('- item one\n- item two\n  continued here')
    const [first, second] = Array.from(article.querySelectorAll('li'))

    expect(article.querySelector('ul')?.getAttribute('data-source-start-line')).toBe('1')
    expect(first?.getAttribute('data-source-start-line')).toBe('1')
    expect(second?.getAttribute('data-source-start-line')).toBe('2')
    expect(second?.getAttribute('data-source-end-line')).toBe('3')
    expect(markerLines(article)).toEqual(['1', '2', '3'])
  })
})
