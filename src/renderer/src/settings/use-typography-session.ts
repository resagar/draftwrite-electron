import { useCallback, useEffect, useRef, useState } from 'react'
import { useDataPort } from '../data/port-context'
import { readPreferences, savePreferences } from './preferences'
import type { TypographyChoice, TypographyContext } from './preferences'
import type { TypographySnapshot } from '../../../shared/typography'

export function useTypographySession(settingsWindow: boolean): {
  preferences: TypographySnapshot['preferences']
  storageError: boolean
  ready: boolean
  error: string | null
  update: (context: TypographyContext, changes: Partial<TypographyChoice>) => void
} {
  const port = useDataPort()
  const [initial] = useState(readPreferences)
  const [state, setState] = useState<TypographySnapshot>({
    preferences: initial,
    revision: -1,
    storageError: false
  })
  const [error, setError] = useState<string | null>(null)
  const latest = useRef(-1)
  const lastWritten = useRef(JSON.stringify(initial))
  const writeFailed = useRef(false)

  useEffect(() => {
    let active = true
    const receive = (snapshot: TypographySnapshot): void => {
      if (!active || snapshot.revision < latest.current) return
      latest.current = snapshot.revision
      setState(snapshot)
      if (settingsWindow) return
      const serialized = JSON.stringify(snapshot.preferences)
      if (serialized === lastWritten.current && !(writeFailed.current && !snapshot.storageError))
        return
      lastWritten.current = serialized
      writeFailed.current = !savePreferences(snapshot.preferences)
      void port.reportTypographyStorage(snapshot.revision, writeFailed.current).catch(() => {
        if (active) setError('The save status could not be shared. Change a setting to retry.')
      })
    }
    const unsubscribe = port.onTypographyChanged(receive)
    void port
      .getTypography(settingsWindow ? undefined : initial)
      .then(receive)
      .catch(() => {
        if (active) setError('Settings could not be loaded. Reopen the window to try again.')
      })
    return () => {
      active = false
      unsubscribe()
    }
  }, [port, settingsWindow, initial])

  const update = useCallback(
    (context: TypographyContext, changes: Partial<TypographyChoice>) => {
      setError(null)
      // Notifications are the ordered source of truth; invoke responses can arrive late.
      void port
        .patchTypography({ context, changes })
        .catch(() => setError('The change could not be applied. Try again.'))
    },
    [port]
  )

  return {
    preferences: state.preferences,
    storageError: state.storageError,
    ready: state.revision >= 0,
    error,
    update
  }
}
