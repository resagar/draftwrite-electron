import { useCallback } from 'react'
import { useDataPort } from '../data/port-context'
import type { Story } from '../data/types'
import { useList, type ListResult } from './use-list'

export function useStories(): ListResult<Story> {
  const port = useDataPort()
  const load = useCallback(() => port.listStories(), [port])

  return useList(load)
}
