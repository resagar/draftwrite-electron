import type { JSX, ReactNode } from 'react'
import { Modal } from '../Modal/Modal'

type ConfirmDialogProps = {
  title: string
  message: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  error?: string | null
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  error = null
}: ConfirmDialogProps): JSX.Element {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-xs leading-relaxed text-base-content/80">{message}</p>

      {error === null ? null : (
        <p role="alert" className="mt-2 text-xs text-error">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-line px-2 py-1 text-xs text-base-content/80 transition hover:bg-neutral/40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded border border-error/50 bg-error/10 px-2 py-1 text-xs font-medium text-error transition hover:bg-error/20"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
