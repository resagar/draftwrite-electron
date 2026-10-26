import { describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ArticleTargetLink } from '../../state/article-target-context'
import { TargetPanel } from './TargetPanel'

function targetLink(overrides: Partial<ArticleTargetLink> = {}): ArticleTargetLink {
  return {
    articleId: 'a1',
    value: 'Ship the essay',
    save: jest.fn(),
    ...overrides
  }
}

describe('TargetPanel', () => {
  it('shows the empty state and an add action', () => {
    render(<TargetPanel link={targetLink({ value: '' })} />)

    expect(screen.getByRole('region', { name: 'Target' })).toBeTruthy()
    expect(screen.getByText('No target yet.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add target' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit target' })).toBeNull()
  })

  it('shows the target and an edit action when it has a value', () => {
    render(<TargetPanel link={targetLink()} />)

    expect(screen.getByText('Ship the essay')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit target' })).toBeTruthy()
  })

  it('turns into a focused textarea when editing', () => {
    render(<TargetPanel link={targetLink()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit target' }))

    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Target' })

    expect(textarea.value).toBe('Ship the essay')
    expect(document.activeElement).toBe(textarea)
    expect(textarea.selectionStart).toBe('Ship the essay'.length)
    expect(textarea.selectionEnd).toBe('Ship the essay'.length)
  })

  it('cancels without saving and returns the focus to the trigger', () => {
    const link = targetLink()

    render(<TargetPanel link={link} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit target' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Target' }), {
      target: { value: 'A different target' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(link.save).not.toHaveBeenCalled()
    expect(screen.getByText('Ship the essay')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Edit target' }))
  })

  it('saves the trimmed value and returns to reading', () => {
    const link = targetLink()

    render(<TargetPanel link={link} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit target' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Target' }), {
      target: { value: '  A better target  ' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(link.save).toHaveBeenCalledWith('A better target')
    expect(screen.queryByRole('textbox', { name: 'Target' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Edit target' }))
  })

  it('cancels with Escape and saves with the platform modifier', () => {
    const link = targetLink()

    render(<TargetPanel link={link} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit target' }))
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Target' }), { key: 'Escape' })

    expect(screen.queryByRole('textbox', { name: 'Target' })).toBeNull()
    expect(link.save).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Edit target' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Target' }), {
      target: { value: 'Saved with the keyboard' }
    })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Target' }), {
      key: 'Enter',
      ctrlKey: true
    })

    expect(link.save).toHaveBeenCalledWith('Saved with the keyboard')

    fireEvent.click(screen.getByRole('button', { name: 'Edit target' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Target' }), {
      target: { value: 'Saved with the command key' }
    })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Target' }), {
      key: 'Enter',
      metaKey: true
    })

    expect(link.save).toHaveBeenCalledWith('Saved with the command key')
  })

  it('accepts a target of exactly 255 bytes', () => {
    const link = targetLink()
    const value = 'a'.repeat(255)

    render(<TargetPanel link={link} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit target' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Target' }), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(link.save).toHaveBeenCalledWith(value)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('rejects a target over 255 bytes without saving', () => {
    const link = targetLink()

    render(<TargetPanel link={link} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit target' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Target' }), {
      target: { value: 'a'.repeat(256) }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const error = screen.getByRole('alert')
    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Target' })

    expect(link.save).not.toHaveBeenCalled()
    expect(error.textContent).toMatch(/255 bytes/)
    expect(textarea.getAttribute('aria-invalid')).toBe('true')
    expect(textarea.getAttribute('aria-describedby')).toBe(error.id)
  })

  it('measures the limit in UTF-8 bytes, not in characters', () => {
    const link = targetLink()

    render(<TargetPanel link={link} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit target' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Target' }), {
      target: { value: 'ñ'.repeat(128) }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(link.save).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('allows clearing the target', () => {
    const link = targetLink()

    render(<TargetPanel link={link} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit target' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Target' }), {
      target: { value: '   ' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(link.save).toHaveBeenCalledWith('')
  })
})
