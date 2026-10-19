import type { JSX } from 'react'

type SkeletonListProps = {
  label: string
  rows?: number
}

export function SkeletonList({ label, rows = 5 }: SkeletonListProps): JSX.Element {
  return (
    <div role="status" aria-label={label} aria-busy="true" className="space-y-1 p-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} aria-hidden="true" className="h-14 animate-pulse rounded bg-neutral/40" />
      ))}
    </div>
  )
}
