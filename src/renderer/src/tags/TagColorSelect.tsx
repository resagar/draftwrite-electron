import { useLayoutEffect, useRef, useState, type JSX } from 'react'
import { ChevronDown } from 'lucide-react'
import { tagColors, type TagColor } from '../../../shared/tags'
import { tagStyle } from './tag-style'

export function TagColorSelect({
  value,
  disabled,
  onChange
}: {
  value: TagColor
  disabled: boolean
  onChange: (color: TagColor) => void
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const options = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!open || !options.current || !button.current) return
    const rect = button.current.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom - 12
    const above = rect.top - 12
    const upwards = below < 160 && above > below
    const height = Math.min(208, upwards ? above : below)
    Object.assign(options.current.style, {
      left: `${Math.max(8, rect.left)}px`,
      top: `${upwards ? rect.top - height - 4 : rect.bottom + 4}px`,
      width: `${Math.min(rect.width, window.innerWidth - 16)}px`,
      maxHeight: `${height}px`
    })
    options.current
      .querySelector<HTMLElement>('[aria-selected="true"]')
      ?.focus({ preventScroll: true })
  }, [open])
  const close = (): void => {
    setOpen(false)
    button.current?.focus()
  }
  return (
    <div
      className="relative mt-1"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-label="Tag color"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="tag-color-options"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className="flex w-full items-center gap-2 rounded border border-line bg-base-200 px-3 py-2 text-left"
      >
        <span aria-hidden="true" className="tag-dot" style={tagStyle(value)} />
        <span className="flex-1">{value}</span>
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div
          ref={options}
          id="tag-color-options"
          role="listbox"
          aria-label="Tag colors"
          className="fixed z-50 max-h-52 overflow-y-auto rounded border border-line bg-base-200 p-1 shadow-lg"
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === 'Escape') {
              event.preventDefault()
              close()
              return
            }
            if (event.key === 'Tab') {
              button.current?.focus()
              setOpen(false)
              return
            }
            const buttons = Array.from(options.current!.querySelectorAll('button'))
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault()
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? buttons.length - 1
                    : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
                      buttons.length
              buttons[next]?.focus()
            } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
              buttons
                .find((option) => option.textContent?.startsWith(event.key.toLowerCase()))
                ?.focus()
            }
          }}
        >
          {tagColors.map((color) => (
            <button
              key={color}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={value === color}
              onClick={() => {
                onChange(color)
                close()
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-neutral focus-visible:bg-neutral"
            >
              <span aria-hidden="true" className="tag-dot" style={tagStyle(color)} />
              {color}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
