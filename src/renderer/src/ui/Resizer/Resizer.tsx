import type { JSX } from 'react'
import { cn } from '../../lib/cn'
import type { ResizerHandleProps } from './use-resizer'

type ResizerProps = ResizerHandleProps & {
  className?: string
}

/**
 * Vertical grip between two panels.
 *
 * It is a real separator: focusable, with arrow/Home/End keys and a
 * double-click reset. The panel owns the drag state and the width; this
 * component only renders the handle and forwards the handlers.
 */
export function Resizer({
  label,
  value,
  min,
  max,
  valueText,
  isResizing,
  className,
  ...handlers
}: ResizerProps): JSX.Element {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      tabIndex={0}
      title="Drag to resize. Double-click to reset."
      data-resizing={isResizing ? 'true' : undefined}
      className={cn(
        'group flex w-2 shrink-0 cursor-col-resize touch-none select-none items-center justify-center bg-transparent outline-none transition-colors hover:bg-primary/20 focus-visible:bg-primary/30',
        isResizing && 'bg-primary/30',
        className
      )}
      {...handlers}
    >
      <span
        aria-hidden="true"
        className="h-8 w-px rounded bg-base-content/20 group-hover:bg-primary/60 group-focus-visible:bg-primary/70"
      />
    </div>
  )
}
