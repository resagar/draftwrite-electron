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

  const activeIndex = count === 0 ? 0 : Math.min(focusIndex, count - 1)

  const onItemFocus = (index: number): void => {
    setFocusIndex(index)
  }

  const tabIndexFor = (index: number): number => (index === activeIndex ? 0 : -1)

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>): void => {
    const target = event.target
    if (!(target instanceof HTMLElement) || target.closest('[role="option"]') === null) {
      return
    }

    if (count === 0) {
      return
    }

    let nextIndex: number | null = null
    if (event.key === 'ArrowDown') {
      nextIndex = Math.min(activeIndex + 1, count - 1)
    } else if (event.key === 'ArrowUp') {
      nextIndex = Math.max(activeIndex - 1, 0)
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
      onActivate(activeIndex)
    }
  }

  return { itemsRef, onItemFocus, tabIndexFor, onKeyDown }
}
