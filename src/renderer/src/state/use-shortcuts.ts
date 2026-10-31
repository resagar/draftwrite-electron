import { useEffect } from 'react'

type ShortcutHandlers = {
  onNew: () => void
  onSave: () => void
  onToggleZen: () => void
}

// The N shortcut creates whatever the active library offers. The caller passes
// the same contextual action the sidebar button runs, so the two cannot
// diverge; when that action is disabled, the key is still consumed.
export function useShortcuts({ onNew, onSave, onToggleZen }: ShortcutHandlers): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || (!event.metaKey && !event.ctrlKey)) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 'd' && event.shiftKey) {
        event.preventDefault()
        onToggleZen()
      } else if (key === 'n') {
        event.preventDefault()
        onNew()
      } else if (key === 's') {
        event.preventDefault()
        onSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNew, onSave, onToggleZen])
}
