import { useMemo } from 'react'

export function modifierFor(userAgent: string): string {
  return /Mac|iPhone|iPad|iPod/i.test(userAgent) ? '⌘' : 'Ctrl'
}

export function usePlatformModifier(): string {
  return useMemo(() => modifierFor(typeof navigator === 'undefined' ? '' : navigator.userAgent), [])
}
