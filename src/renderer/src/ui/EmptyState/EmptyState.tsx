import type { JSX, ReactNode } from 'react'

type EmptyStateProps = {
  icon: ReactNode
  title: string
  description: string
}

export function EmptyState({ icon, title, description }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <span aria-hidden="true" className="text-base-content/40">
        {icon}
      </span>
      <h2 className="text-xs font-semibold text-base-content/80">{title}</h2>
      <p className="max-w-[26ch] text-xs text-base-content/60">{description}</p>
    </div>
  )
}
