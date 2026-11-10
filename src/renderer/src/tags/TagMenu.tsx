import { useEffect, useLayoutEffect, useRef, type JSX } from 'react'

type Props = {
  request: { name: string; x: number; y: number }
  onSettings: () => void
  onFilter: () => void
  onDelete: () => void
  onClose: () => void
}

export function TagMenu({ request, onSettings, onFilter, onDelete, onClose }: Props): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const menu = ref.current!
    const rect = menu.getBoundingClientRect()
    menu.style.left = `${Math.max(8, Math.min(request.x, window.innerWidth - rect.width - 8))}px`
    menu.style.top = `${Math.max(8, Math.min(request.y, window.innerHeight - rect.height - 8))}px`
    menu.querySelector('button')?.focus()
  }, [request])
  useEffect(() => {
    const outside = (event: PointerEvent): void => {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])
  const item =
    'block w-full rounded px-3 py-2 text-left text-xs hover:bg-neutral focus-visible:bg-neutral'
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Actions for tag ${request.name}`}
      className="fixed z-50 w-52 max-w-[calc(100vw-1rem)] rounded border border-line bg-base-200 p-1 shadow-lg"
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Escape' || event.key === 'Tab') {
          event.preventDefault()
          onClose()
          return
        }
        const buttons = Array.from(ref.current!.querySelectorAll('button'))
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault()
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? buttons.length - 1
                : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
          buttons[next]?.focus()
        }
      }}
    >
      <button type="button" role="menuitem" className={item} onClick={onSettings}>
        Tag Settings…
      </button>
      <button type="button" role="menuitem" className={item} onClick={onFilter}>
        Filter by tag
      </button>
      <div role="separator" className="my-1 border-t border-line" />
      <button type="button" role="menuitem" className={`${item} text-error`} onClick={onDelete}>
        Delete tag everywhere…
      </button>
    </div>
  )
}
