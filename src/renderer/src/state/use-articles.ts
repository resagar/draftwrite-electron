import { useCallback } from 'react'
import { useDataPort } from '../data/port-context'
import type { Article } from '../data/types'
import { useList, type ListResult } from './use-list'

export function useArticles(): ListResult<Article> {
  const port = useDataPort()
  const load = useCallback(() => port.listArticles(), [port])

  return useList(load)
}
