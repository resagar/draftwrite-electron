import { describe, expect, it } from '@jest/globals'
import { render, screen, within } from '@testing-library/react'
import { MarkdownPreview } from './MarkdownPreview'

const renderPreview = (markdown: string): HTMLElement => {
  render(<MarkdownPreview markdown={markdown} />)

  return within(screen.getByRole('region', { name: 'Preview' })).getByRole('article')
}

describe('MarkdownPreview rendering', () => {
  it('renders headings, line breaks and gfm inline markup', () => {
    const article = renderPreview('# Calm\n\nFirst line\nsecond line with **sturdy** and ~~old~~')

    expect(within(article).getByRole('heading', { level: 1, name: 'Calm' })).toBeTruthy()
    expect(within(article).getByText('sturdy').tagName).toBe('STRONG')
    expect(within(article).getByText('old').tagName).toBe('DEL')
    expect(article.querySelectorAll('p br')).toHaveLength(1)
  })

  it('renders gfm tables and lists', () => {
    const article = renderPreview('| a | b |\n| - | - |\n| 1 | 2 |\n\n- one\n- two')

    expect(within(article).getByRole('table')).toBeTruthy()
    expect(within(article).getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders nothing for an empty document', () => {
    expect(renderPreview('').textContent).toBe('')
  })

  it('marks source lines for the scroll sync', () => {
    const article = renderPreview('# Calm\n\nA line')

    expect(article.querySelector('[data-source-line="1"]')).not.toBeNull()
    expect(article.querySelector('[data-source-line="3"]')).not.toBeNull()
    expect(article.querySelector('h1')?.getAttribute('data-source-start-line')).toBe('1')
  })
})

describe('MarkdownPreview scroller', () => {
  it('owns its scroll and keeps every write instant', () => {
    render(<MarkdownPreview markdown="# Calm" />)
    const section = screen.getByRole('region', { name: 'Preview' })

    expect(section.className).toContain('overflow-y-auto')
    expect(section.className).toContain('min-h-0')
    expect(section.className).toContain('flex-1')
    expect(section.className).toContain('overscroll-contain')
    expect(section.className).toContain('[overflow-anchor:none]')
    expect(section.className).toContain('[scroll-behavior:auto]')
  })

  it('ends with the bottom spacer that lets the last line reach the top', () => {
    render(<MarkdownPreview markdown="# Calm" />)
    const section = screen.getByRole('region', { name: 'Preview' })
    const bottom = section.querySelector('[data-preview-spacer="bottom"]')

    expect(bottom?.getAttribute('aria-hidden')).toBe('true')
    expect(bottom?.textContent).toBe('')
    expect(section.lastElementChild).toBe(bottom)
    expect(bottom?.previousElementSibling?.tagName).toBe('ARTICLE')
  })

  it('has no top spacer and no sync child of its own', () => {
    render(<MarkdownPreview markdown="# Calm" />)
    const section = screen.getByRole('region', { name: 'Preview' })

    expect(section.querySelector('[data-preview-spacer="top"]')).toBeNull()
  })

  it('does not crash without layout or a ResizeObserver', () => {
    // jsdom reports a zero clientHeight and has no ResizeObserver.
    expect(typeof ResizeObserver).toBe('undefined')
    expect(() =>
      render(<MarkdownPreview markdown={'# Calm\n\nA line\nanother line'} />)
    ).not.toThrow()
  })
})
