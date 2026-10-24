import { beforeEach, describe, expect, it } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'
import { ListColumn } from './ListColumn'

beforeEach(() => {
  window.localStorage.clear()
})

describe('ListColumn resizing', () => {
  it('exposes a separator and changes the column width from the keyboard', () => {
    render(
      <ListColumn title="Stories" count={2}>
        <div>row</div>
      </ListColumn>
    )

    const region = screen.getByRole('region', { name: 'Stories' })
    const separator = screen.getByRole('separator', { name: 'Resize list' })

    expect(region.style.width).toBe('280px')
    expect(separator.getAttribute('aria-valuenow')).toBe('280')

    fireEvent.keyDown(separator, { key: 'ArrowRight' })

    expect(region.style.width).toBe('296px')
    expect(separator.getAttribute('aria-valuenow')).toBe('296')
    expect(window.localStorage.getItem('draftwrite.panel.list')).toBe('296')
  })
})

describe('ListColumn collapsing', () => {
  it('closes to zero width without a separator, keeping the content mounted', () => {
    const { container } = render(
      <ListColumn title="Stories" collapsed>
        <div>row</div>
      </ListColumn>
    )

    const section = container.querySelector('section')

    expect(parseFloat(section?.style.width ?? '1')).toBe(0)
    expect(parseFloat(section?.style.minWidth ?? '1')).toBe(0)
    expect(section?.getAttribute('aria-hidden')).toBe('true')
    expect(section?.hasAttribute('inert')).toBe(true)
    expect(screen.getByText('row')).toBeTruthy()
    expect(screen.queryByRole('separator')).toBeNull()
  })
})
