import { useEffect, useRef, useState } from 'react'
import type {
  EditorialAction,
  EditorialReply,
  EditorialWorkspace,
  PieceKind,
  Writing
} from '../../../../shared/editorial'
import { hasEditorialChanges } from '../../../../shared/editorial'
import type { Increment } from '../../../../shared/editorial'
import { useDataPort } from '../../data/port-context'

export function useEditorial(
  kind: PieceKind,
  pieceId: string
): {
  workspace: EditorialWorkspace | null
  drafts: Record<string, Writing>
  error: string | null
  failedDraftId: string | null
  saving: boolean
  dirty: boolean
  stale: boolean
  edit: (id: string, content: Writing) => void
  execute: (action: EditorialAction) => Promise<EditorialReply>
  flush: () => Promise<void>
  resolveStale: (keepLocal: boolean, increment: Increment, description: string) => Promise<void>
} {
  const port = useDataPort()
  const [workspace, setWorkspace] = useState<EditorialWorkspace | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Writing>>({})
  const [error, setError] = useState<string | null>(null)
  const [failedDraftId, setFailedDraftId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [stale, setStale] = useState(false)
  const conflict = useRef(false)
  const current = useRef<EditorialWorkspace | null>(null)
  const pending = useRef(new Map<string, Writing>())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const alive = useRef(true)
  const send = async (action: EditorialAction): Promise<EditorialReply> => {
    if (!port.editorial) throw new Error('Editorial workspace is unavailable')
    let result: EditorialReply
    try {
      result = await port.editorial({
        kind,
        pieceId,
        revision: current.current?.revision,
        action
      })
    } catch (caught) {
      if (alive.current && action.type === 'draft') setFailedDraftId(action.variantId)
      throw caught
    }
    current.current = result.workspace
    if (alive.current) setWorkspace(result.workspace)
    return result
  }
  const acknowledge = (id: string, content: Writing): void => {
    if (pending.current.get(id) !== content) return
    pending.current.delete(id)
    if (alive.current)
      setDrafts((previous) => {
        const next = { ...previous }
        if (next[id] === content) delete next[id]
        return next
      })
  }
  const savePending = async (): Promise<void> => {
    if (conflict.current)
      throw new Error('Review newer stored drafts before retrying local changes.')
    if (timer.current) clearTimeout(timer.current)
    while (pending.current.size) {
      const [id, content] = pending.current.entries().next().value!
      await send({ type: 'draft', variantId: id, content })
      acknowledge(id, content)
    }
    if (alive.current) setDirty(false)
  }
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const next = queue.current
      .catch(() => {})
      .then(async () => {
        if (alive.current) {
          setSaving(true)
          setError(null)
          setFailedDraftId(null)
        }
        try {
          return await operation()
        } catch (caught) {
          if (caught instanceof Error && 'code' in caught && caught.code === 'errEditorialStale') {
            conflict.current = true
            if (timer.current) clearTimeout(timer.current)
            if (alive.current) setStale(true)
          }
          if (alive.current)
            setError(caught instanceof Error ? caught.message : 'Editorial operation failed')
          throw caught
        } finally {
          if (alive.current) setSaving(false)
        }
      })
    queue.current = next
    return next
  }
  const execute = (action: EditorialAction): Promise<EditorialReply> =>
    enqueue(async () => {
      if (action.type !== 'read' || !conflict.current) await savePending()
      const result = await send(action)
      if (action.type !== 'read' && action.type !== 'plan' && alive.current)
        setDrafts((previous) => {
          const next = { ...previous }
          if (!pending.current.has(action.variantId)) delete next[action.variantId]
          return next
        })
      return result
    })
  const flush = (): Promise<void> => enqueue(savePending)
  const resolveStale = (
    keepLocal: boolean,
    increment: Increment,
    description: string
  ): Promise<void> =>
    enqueue(async () => {
      let applied = 0
      try {
        await send({ type: 'read' })
        if (keepLocal) {
          while (pending.current.size) {
            const [id, content] = pending.current.entries().next().value!
            const stored = current.current!.variants.find((variant) => variant.id === id)
            if (!stored || stored.archived)
              throw new Error(
                'The edited variant is no longer writable. Keep a copy of your local text before discarding it.'
              )
            if (hasEditorialChanges(current.current!, stored))
              await send({ type: 'version', variantId: id, increment, description })
            await send({ type: 'draft', variantId: id, content })
            acknowledge(id, content)
            applied++
          }
        } else pending.current.clear()
        conflict.current = false
        if (alive.current) {
          setStale(false)
          setDirty(false)
          setDrafts({})
          setError(null)
        }
      } catch (caught) {
        if (!applied) throw caught
        const message = caught instanceof Error ? caught.message : 'Unable to save remaining drafts'
        throw new Error(
          `${applied} draft(s) already applied; only remaining drafts are pending. ${message}`,
          { cause: caught }
        )
      }
    })
  const latestFlush = useRef(flush)
  useEffect(() => {
    latestFlush.current = flush
  })
  useEffect(() => {
    alive.current = true
    void enqueue(() => send({ type: 'read' })).catch(() => {})
    return () => {
      alive.current = false
      if (timer.current) clearTimeout(timer.current)
      void latestFlush.current().catch(() => {})
    }
    // Each workspace instance is keyed by its piece identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, pieceId])
  const edit = (id: string, content: Writing): void => {
    pending.current.set(id, content)
    setDirty(true)
    setDrafts((previous) => ({ ...previous, [id]: content }))
    if (timer.current) clearTimeout(timer.current)
    if (!conflict.current)
      timer.current = setTimeout(() => {
        void latestFlush.current().catch(() => {})
      }, 700)
  }
  return {
    workspace,
    drafts,
    error,
    failedDraftId,
    saving,
    dirty,
    stale,
    edit,
    execute,
    flush,
    resolveStale
  }
}
