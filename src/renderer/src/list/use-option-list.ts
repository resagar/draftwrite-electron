import { useRef, useState, type KeyboardEvent, type RefObject } from 'react'

type UseOptionListArgs = {
  count: number
  onActivate: (index: number) => void
}

export type OptionList = {
  itemsRef: RefObject<Array<HTMLElement | null>>
  onItemFocus: (index: number) => void
  tabIndexFor: (index: number) => number
  onKeyDown: (event: KeyboardEvent<HTMLUListElement>) => void
}

export function useOptionList({ count, onActivate }: UseOptionListArgs): OptionList {
  const [focusIndex, setFocusIndex] = useState(0)
  const itemsRef = useRef<Array<HTMLElement | null>>([])

  const onItemFocus = (index: number): void => {
    setFocusIndex(index)
  }

  const tabIndexFor = (index: number): number => (index === focusIndex ? 0 : -1)

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>): void => {
    if (count === 0) {
      return
    }

    let nextIndex: number | null = null
    if (event.key === 'ArrowDown') {
      nextIndex = Math.min(focusIndex + 1, count - 1)
    } else if (event.key === 'ArrowUp') {
      nextIndex = Math.max(focusIndex - 1, 0)
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = count - 1
    }

    if (nextIndex !== null) {
      event.preventDefault()
      setFocusIndex(nextIndex)
      itemsRef.current[nextIndex]?.focus()
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onActivate(focusIndex)
    }
  }

  return { itemsRef, onItemFocus, tabIndexFor, onKeyDown }
}
