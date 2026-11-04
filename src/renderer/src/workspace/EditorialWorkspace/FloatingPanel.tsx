import { useLayoutEffect, useRef, useState, type ReactNode, type JSX } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export type PanelAnchor = { left: number; top: number; bottom: number }
export function FloatingPanel({
  label,
  anchor,
  onClose,
  children
}: {
  label: string
  anchor?: PanelAnchor
  onClose: () => void
  children: ReactNode
}): JSX.Element {
  const panel = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  )
  const [position, setPosition] = useState({ left: 16, top: 80 })
  useLayoutEffect(() => {
    const previousFocus = trigger.current
    panel.current?.querySelector<HTMLElement>('textarea, input, select')?.focus()
    return () => previousFocus?.focus()
  }, [])
  useLayoutEffect(() => {
    const place = (): void => {
      const box = panel.current?.getBoundingClientRect()
      const width = box?.width || 352
      const height = box?.height || 280
      const left = Math.max(
        8,
        Math.min(anchor?.left ?? (window.innerWidth - width) / 2, window.innerWidth - width - 8)
      )
      const below = (anchor?.bottom ?? 64) + 8
      const top =
        below + height <= window.innerHeight - 8
          ? below
          : Math.max(8, (anchor?.top ?? window.innerHeight) - height - 8)
      setPosition({ left, top })
    }
    place()
    window.addEventListener('resize', place)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
    if (panel.current) observer?.observe(panel.current)
    return () => {
      window.removeEventListener('resize', place)
      observer?.disconnect()
    }
  }, [anchor?.left, anchor?.top, anchor?.bottom])
  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      className="editorial-popover"
      style={position}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <div className="editorial-popover-heading">
        <strong>{label}</strong>
        <button type="button" aria-label={`Close ${label}`} onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      {children}
    </div>,
    document.body
  )
}
