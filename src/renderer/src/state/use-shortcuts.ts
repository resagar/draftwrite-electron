import { useEffect } from 'react'

type ShortcutHandlers = {
  onNewStory: () => void
  onSave: () => void
}

export function useShortcuts({ onNewStory, onSave }: ShortcutHandlers): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!event.metaKey && !event.ctrlKey) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 'n') {
        event.preventDefault()
        onNewStory()
      } else if (key === 's') {
        event.preventDefault()
        onSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNewStory, onSave])
}
