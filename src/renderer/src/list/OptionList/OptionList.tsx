import type { JSX, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { useOptionList } from '../use-option-list'

type OptionListProps<T> = {
  label: string
  items: readonly T[]
  getId: (item: T) => string
  selectedId: string | null
  onSelect: (item: T) => void
  renderContent: (item: T, selected: boolean) => ReactNode
  renderAction?: (item: T) => ReactNode
}

export function OptionList<T>({
  label,
  items,
  getId,
  selectedId,
  onSelect,
  renderContent,
  renderAction
}: OptionListProps<T>): JSX.Element {
  const list = useOptionList({
    count: items.length,
    onActivate: (index) => {
      const item = items[index]
      if (item !== undefined) {
        onSelect(item)
      }
    }
  })

  return (
    <ul
      role="listbox"
      aria-label={label}
      className="divide-y divide-base-300/80"
      onKeyDown={list.onKeyDown}
    >
      {items.map((item, index) => {
        const selected = getId(item) === selectedId
        const action = renderAction?.(item) ?? null

        return (
          <li key={getId(item)} role="presentation" className="relative">
            <div
              role="option"
              aria-selected={selected}
              tabIndex={list.tabIndexFor(index)}
              ref={(element) => {
                list.itemsRef.current[index] = element
              }}
              onFocus={() => list.onItemFocus(index)}
              onClick={() => onSelect(item)}
              className={cn(
                'cursor-pointer border-l-2 px-3 py-2.5 transition',
                action !== null && 'pr-10',
                selected ? 'border-primary bg-neutral' : 'border-transparent hover:bg-neutral/40'
              )}
            >
              {renderContent(item, selected)}
            </div>
            {action !== null ? <div className="absolute top-2 right-2">{action}</div> : null}
          </li>
        )
      })}
    </ul>
  )
}
