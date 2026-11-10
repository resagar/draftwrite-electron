import { useEffect, useState } from 'react'
import type { WindowAction, WindowState } from '../../../../shared/window-controls'
import { useDataPort } from '../../data/port-context'

export type WindowChrome = {
  state: WindowState | null
  error: string | null
  execute: (action: WindowAction) => void
}

export function useWindowChrome(): WindowChrome {
  const { windowControls: controls } = useDataPort()
  const [state, setState] = useState<WindowState | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!controls) return
    let active = true
    let receivedEvent = false
    const stop = controls.onChanged((next) => {
      receivedEvent = true
      if (active) setState(next)
    })
    void controls
      .getState()
      .then((next) => {
        if (active && !receivedEvent) setState(next)
      })
      .catch(() => {
        if (active) setError('Window controls could not be loaded. Restart the app to retry.')
      })
    return () => {
      active = false
      stop()
    }
  }, [controls])
  useEffect(() => {
    if (state?.translucent) document.documentElement.dataset.contentTranslucent = 'true'
    if (state?.backdrop) document.documentElement.dataset.windowBackdrop = state.backdrop
    return () => {
      delete document.documentElement.dataset.contentTranslucent
      delete document.documentElement.dataset.windowBackdrop
    }
  }, [state?.translucent, state?.backdrop])
  return {
    state,
    error,
    execute: (action) => {
      if (!controls) return
      setError(null)
      void controls
        .execute(action)
        .catch(() => setError('The window action failed. Please try again.'))
    }
  }
}
