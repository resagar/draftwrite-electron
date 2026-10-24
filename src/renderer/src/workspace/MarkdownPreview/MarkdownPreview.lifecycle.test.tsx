import { jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { MarkdownPreview } from './MarkdownPreview'
import { createPreviewScrollAnimator } from './preview-scroll-animator'

jest.mock('./preview-scroll-animator', () => ({
  createPreviewScrollAnimator: jest.fn(({ container }: { container: HTMLElement }) => ({
    container,
    scrollTo: jest.fn(),
    cancel: jest.fn(),
    isAnimating: () => false,
    destroy: jest.fn()
  }))
}))

const createAnimator = jest.mocked(createPreviewScrollAnimator)

describe('MarkdownPreview scroller lifecycle', () => {
  beforeEach(() => {
    createAnimator.mockClear()
  })

  it('creates the animator after the scroller ref is attached', () => {
    render(<MarkdownPreview markdown={'# Calm'} />)

    // This is the regression: `PreviewCursorSync` is a child of the section it
    // measures, so a layout effect there ran before the parent ref existed and
    // the animator was never created. The creation must happen in a passive
    // effect, with the ref already attached.
    expect(createAnimator).toHaveBeenCalledTimes(1)
    expect(createAnimator.mock.calls[0][0].container).toBe(screen.getByLabelText('Preview'))
  })

  it('destroys the animator when the preview unmounts', () => {
    const { unmount } = render(<MarkdownPreview markdown={'# Calm'} />)
    const animator = createAnimator.mock.results[0].value as { destroy: () => void }

    unmount()

    expect(animator.destroy).toHaveBeenCalledTimes(1)
  })
})
