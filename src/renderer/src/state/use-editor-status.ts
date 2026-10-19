import { useEffect, useRef } from 'react'
import { countCharacters, countWords, readingTimeMinutes } from '../data/format'
import { publishStatus, resetStatus, type SaveStatus } from './status-store'

type EditorStatusArgs = {
  text: string
  status: SaveStatus
}

type EditorStatusControls = {
  publishCursor: (cursor: { line: number; column: number }) => void
}

// Reports the editor to the status bar. The first report is deferred so the
// bar has subscribed before it, and typing never re-renders the application
// tree: only the bar reads this.
export function useEditorStatus({ text, status }: EditorStatusArgs): EditorStatusControls {
  // Mount snapshot: the deferred first report must show what the editor opened
  // with, whichever render the effect runs after.
  const initial = useRef({ text, status })

  useEffect(() => {
    let active = true
    const first = initial.current
    const words = countWords(first.text)

    queueMicrotask(() => {
      if (!active) {
        return
      }

      publishStatus({
        save: first.status,
        words,
        characters: countCharacters(first.text),
        readingMinutes: readingTimeMinutes(words)
      })
    })

    return () => {
      active = false
      resetStatus()
    }
  }, [])

  useEffect(() => {
    publishStatus({ save: status })
  }, [status])

  useEffect(() => {
    const words = countWords(text)

    publishStatus({
      words,
      characters: countCharacters(text),
      readingMinutes: readingTimeMinutes(words)
    })
  }, [text])

  return {
    publishCursor: (cursor: { line: number; column: number }) => publishStatus({ cursor })
  }
}
