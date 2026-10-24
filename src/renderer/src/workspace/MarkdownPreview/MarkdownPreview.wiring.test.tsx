import { describe, expect, it, jest } from '@jest/globals'

// The sync child renders `null`, so its presence is only observable from the
// outside: the preview must mount it, and nothing else.
jest.mock('./PreviewCursorSync', () => ({ PreviewCursorSync: jest.fn(() => null) }))

import { render, screen } from '@testing-library/react'
import type { RefObject } from 'react'
import { MarkdownPreview } from './MarkdownPreview'
import { PreviewCursorSync } from './PreviewCursorSync'

type PreviewCursorSyncProps = {
  markdown: string
  containerRef: RefObject<HTMLElement | null>
  articleRef: RefObject<HTMLElement | null>
  topSpacerRef: RefObject<HTMLElement | null>
  bottomSpacerRef: RefObject<HTMLElement | null>
}

describe('MarkdownPreview wiring', () => {
  it('mounts PreviewCursorSync with the scroller, the article and the spacers', () => {
    render(<MarkdownPreview markdown="# Calm" />)

    const mounted = jest.mocked(PreviewCursorSync)
    const section = screen.getByRole('region', { name: 'Preview' })
    const lastProps = mounted.mock.calls.at(-1)?.[0] as PreviewCursorSyncProps

    expect(mounted).toHaveBeenCalled()
    expect(lastProps.markdown).toBe('# Calm')
    expect(lastProps.containerRef.current).toBe(section)
    expect(lastProps.articleRef.current).toBe(section.querySelector('article'))
    expect(lastProps.topSpacerRef.current).toBe(
      section.querySelector('[data-preview-spacer="top"]')
    )
    expect(lastProps.bottomSpacerRef.current).toBe(
      section.querySelector('[data-preview-spacer="bottom"]')
    )
  })
})
