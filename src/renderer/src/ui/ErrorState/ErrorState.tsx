import { AlertTriangle } from 'lucide-react'
import type { JSX } from 'react'

type ErrorStateProps = {
  title: string
  description: string
  onRetry: () => void
}

export function ErrorState({ title, description, onRetry }: ErrorStateProps): JSX.Element {
  return (
    <div
      role="alert"
      className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center"
    >
      <AlertTriangle aria-hidden="true" className="h-6 w-6 text-error" />
      <h2 className="text-xs font-semibold text-base-content/80">{title}</h2>
      <p className="max-w-[32ch] text-xs text-base-content/60">{description}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 rounded border border-line bg-neutral px-2 py-1 text-xs text-base-content transition hover:bg-neutral/80"
      >
        Try again
      </button>
    </div>
  )
}
