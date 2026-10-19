import type { JSX, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type KbdProps = {
  children: ReactNode
  className?: string
}

export function Kbd({ children, className }: KbdProps): JSX.Element {
  return (
    <kbd
      className={cn(
        'rounded border border-base-content/10 bg-base-300 px-1.5 py-0.5 font-mono text-2xs text-secondary',
        className
      )}
    >
      {children}
    </kbd>
  )
}
