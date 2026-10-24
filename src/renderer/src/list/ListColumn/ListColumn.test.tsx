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
