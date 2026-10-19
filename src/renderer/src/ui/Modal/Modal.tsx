import { useEffect, useRef, type JSX, type KeyboardEvent, type ReactNode } from 'react'

type ModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ title, onClose, children }: ModalProps): JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const panel = panelRef.current
    if (panel === null) {
      return
    }

    const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE)
    ;(focusable[0] ?? panel).focus()
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key !== 'Tab') {
      return
    }

    const panel = panelRef.current
    if (panel === null) {
      return
    }

    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.offsetParent !== null
    )
    if (focusable.length === 0) {
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-300/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
        onKeyDown={handleKeyDown}
        className="flex max-h-full w-full max-w-[520px] flex-col overflow-y-auto rounded border border-line bg-base-100 p-4 shadow-lg"
      >
        <h2 className="mb-3 text-xs font-semibold tracking-wider uppercase text-base-content/70">
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}
