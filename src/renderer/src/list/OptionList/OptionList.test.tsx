import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, jest } from '@jest/globals'
import type { JSX } from 'react'
import { OptionList } from './OptionList'

type Item = { id: string; name: string }

const items: Item[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' }
]

type OptionListOptions = {
  items?: Item[]
  selectedId?: string | null
  onSelect?: (item: Item) => void
  renderAction?: (item: Item) => JSX.Element
}

function optionList(options: OptionListOptions = {}): JSX.Element {
  return (
    <OptionList
      label="Things"
      items={options.items ?? items}
      getId={(item) => item.id}
      selectedId={options.selectedId ?? null}
      onSelect={options.onSelect ?? jest.fn()}
      renderContent={(item) => <span>{item.name}</span>}
      renderAction={options.renderAction}
    />
  )
}

describe('OptionList', () => {
  it('renders a labelled listbox with one option per item', () => {
    render(optionList())

    const list = screen.getByRole('listbox', { name: 'Things' })

    expect(within(list).getAllByRole('option')).toHaveLength(3)
  })

  it('marks the selected option', () => {
    render(optionList({ selectedId: 'b' }))

    expect(screen.getByRole('option', { name: 'Beta' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('option', { name: 'Alpha' }).getAttribute('aria-selected')).toBe(
      'false'
    )
  })

  it('keeps exactly one option with a tab stop', () => {
    render(optionList())

    const options = screen.getAllByRole('option')

    expect(options.filter((option) => option.getAttribute('tabindex') === '0')).toHaveLength(1)
  })

  it('moves focus with the arrow keys, Home and End', () => {
    render(optionList())

    const first = screen.getByRole('option', { name: 'Alpha' })
    const second = screen.getByRole('option', { name: 'Beta' })
    const third = screen.getByRole('option', { name: 'Gamma' })

    fireEvent.focus(first)
    fireEvent.keyDown(first, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(second)

    fireEvent.keyDown(second, { key: 'End' })
    expect(document.activeElement).toBe(third)

    fireEvent.keyDown(third, { key: 'Home' })
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(first, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(first)
  })

  it('activates the active option with Enter and Space', () => {
    const onSelect = jest.fn()

    render(optionList({ onSelect }))

    const second = screen.getByRole('option', { name: 'Beta' })
    fireEvent.focus(second)
    fireEvent.keyDown(second, { key: 'Enter' })

    expect(onSelect).toHaveBeenLastCalledWith(items[1])

    const third = screen.getByRole('option', { name: 'Gamma' })
    fireEvent.focus(third)
    fireEvent.keyDown(third, { key: ' ' })

    expect(onSelect).toHaveBeenLastCalledWith(items[2])
  })

  it('selects an option with a click', () => {
    const onSelect = jest.fn()

    render(optionList({ onSelect }))
    fireEvent.click(screen.getByRole('option', { name: 'Beta' }))

    expect(onSelect).toHaveBeenCalledWith(items[1])
  })

  it('renders the row action as a sibling of the option', () => {
    render(
      optionList({
        renderAction: (item) => <button type="button">Delete {item.name}</button>
      })
    )

    const action = screen.getByRole('button', { name: 'Delete Alpha' })

    expect(action.closest('[role="option"]')).toBeNull()
  })

  it('does not select the row when its action is clicked', () => {
    const onSelect = jest.fn()
    const onAction = jest.fn()

    render(
      optionList({
        onSelect,
        renderAction: (item) => (
          <button type="button" onClick={() => onAction(item)}>
            Delete {item.name}
          </button>
        )
      })
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete Alpha' }))

    expect(onAction).toHaveBeenCalledWith(items[0])
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('does not select the row when its action receives Enter or Space', () => {
    const onSelect = jest.fn()

    render(
      optionList({
        onSelect,
        renderAction: (item) => <button type="button">Delete {item.name}</button>
      })
    )

    const action = screen.getByRole('button', { name: 'Delete Alpha' })

    fireEvent.keyDown(action, { key: 'Enter' })
    fireEvent.keyDown(action, { key: ' ' })

    expect(onSelect).not.toHaveBeenCalled()
  })

  it('does not render an action slot or reserve its space without a row action', () => {
    render(optionList())

    expect(screen.queryByRole('button')).toBeNull()

    for (const option of screen.getAllByRole('option')) {
      expect(option.className).not.toContain('pr-10')
    }
  })

  it('keeps a tab stop and activates a real item when the list shrinks', () => {
    const onSelect = jest.fn()
    const { rerender } = render(optionList({ onSelect }))

    fireEvent.focus(screen.getByRole('option', { name: 'Gamma' }))

    rerender(optionList({ items: [items[0]], onSelect }))

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(1)
    expect(options.filter((option) => option.getAttribute('tabindex') === '0')).toHaveLength(1)

    fireEvent.keyDown(options[0], { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledWith(items[0])
  })
})
