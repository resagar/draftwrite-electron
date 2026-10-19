import type { JSX, ReactNode } from 'react'

type EditorErrorProps = {
  message: string | null
  onRetry: () => void
  children?: ReactNode
}

export function EditorError({ message, onRetry }: EditorErrorProps): JSX.Element {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-2 border-t border-error/40 bg-error/10 px-3 py-1.5 text-xs text-error"
    >
      <span>{message ?? 'Your changes are not saved.'}</span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded border border-error/40 px-1.5 py-0.5 transition hover:bg-error/20"
      >
        Try again
      </button>
    </div>
  )
}
