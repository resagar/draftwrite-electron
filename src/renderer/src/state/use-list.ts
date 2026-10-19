import { useCallback, useEffect, useState } from 'react'

export type LoadStatus = 'loading' | 'ready' | 'error'

export type ListResult<T> = {
  status: LoadStatus
  items: T[]
  reload: () => void
  upsert: (item: T) => void
}

export function useList<T extends { ID: string }>(load: () => Promise<T[]>): ListResult<T> {
  const [items, setItems] = useState<T[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true

    load()
      .then((loaded) => {
        if (!active) {
          return
        }
        setItems(loaded)
        setStatus('ready')
      })
      .catch(() => {
        if (!active) {
          return
        }
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [load, attempt])

  const reload = useCallback(() => {
    setStatus('loading')
    setAttempt((current) => current + 1)
  }, [])

  // Writing returns the stored entity, so the list is updated with what the
  // backend actually saved instead of with a local guess.
  const upsert = useCallback((item: T) => {
    setItems((current) => {
      const known = current.some((candidate) => candidate.ID === item.ID)

      return known
        ? current.map((candidate) => (candidate.ID === item.ID ? item : candidate))
        : [item, ...current]
    })
  }, [])

  return { status, items, reload, upsert }
}
