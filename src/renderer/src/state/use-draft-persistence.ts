import { useCallback, useEffect, useRef, useState } from 'react'
import { describeError } from '../data/errors'
import type { SaveStatus } from './status-store'

const DELAY_MS = 700

type DraftPersistenceArgs<T extends { ID: string }> = {
  create: (draft: T) => Promise<T>
  update: (draft: T) => Promise<T>
  onStored: (stored: T, created: boolean) => void
  canPersist: (draft: T) => boolean
  initialStatus: SaveStatus
}

export type DraftPersistence<T> = {
  status: SaveStatus
  error: string | null
  schedule: (draft: T) => void
  saveNow: () => Promise<void>
}

// Keeps a draft in step with the backend: nothing is written until the draft
// can be persisted at all, the first write creates and the rest update, and
// writes never overlap.
export function useDraftPersistence<T extends { ID: string }>({
  create,
  update,
  onStored,
  canPersist,
  initialStatus
}: DraftPersistenceArgs<T>): DraftPersistence<T> {
  const [status, setStatus] = useState<SaveStatus>(initialStatus)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number | null>(null)
  const pending = useRef<T | null>(null)
  const queue = useRef<Promise<void>>(Promise.resolve())

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const persist = useCallback(
    async (draft: T) => {
      const creating = draft.ID === ''
      setStatus('saving')
      setError(null)

      // The draft is consumed before it is written: leaving while the write
      // is in flight must not send the same thing a second time.
      if (pending.current === draft) {
        pending.current = null
      }

      try {
        const stored = creating ? await create(draft) : await update(draft)
        onStored(stored, creating)
        setStatus('saved')

        // Anything typed while the create was in flight was scheduled with
        // no ID yet. It now belongs to the stored entity, so writing it out
        // later updates instead of creating a second one.
        if (creating && pending.current !== null) {
          pending.current = { ...pending.current, ID: stored.ID }
        }
      } catch (caught) {
        // The domain's own reason (a taken topic, a taken title) is what the
        // writer needs to read, so it is translated and kept.
        setError(describeError(caught))
        setStatus('error')

        // The write failed, so this draft is still pending: retrying and
        // leaving must both be able to send it again.
        if (pending.current === null) {
          pending.current = draft
        }
      }
    },
    [create, update, onStored]
  )

  const write = useCallback(
    (draft: T) => {
      queue.current = queue.current.then(() => persist(draft))

      return queue.current
    },
    [persist]
  )

  const schedule = useCallback(
    (draft: T) => {
      pending.current = draft
      clearTimer()

      if (!canPersist(draft)) {
        setStatus('incomplete')
        return
      }

      setStatus('pending')
      timer.current = window.setTimeout(() => {
        timer.current = null
        if (pending.current !== null) {
          void write(pending.current)
        }
      }, DELAY_MS)
    },
    [canPersist, clearTimer, write]
  )

  const saveNow = useCallback(async () => {
    clearTimer()

    if (pending.current !== null && canPersist(pending.current)) {
      await write(pending.current)
    }
  }, [canPersist, clearTimer, write])

  // Leaving the editor must not drop what was typed a moment ago, so the
  // pending write goes out on unmount. The latest closure is kept in a ref so
  // the empty-dependency effect always sees the current handlers.
  const flush = useRef<() => void>(() => {})

  useEffect(() => {
    flush.current = () => {
      clearTimer()

      if (pending.current !== null && canPersist(pending.current)) {
        void write(pending.current)
      }
    }
  })

  useEffect(() => () => flush.current(), [])

  return { status, error, schedule, saveNow }
}
