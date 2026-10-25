import { useCallback } from 'react'
import { useDataPort } from '../data/port-context'
import type { Post } from '../data/types'
import { useList, type ListResult } from './use-list'

export function usePosts(): ListResult<Post> {
  const port = useDataPort()
  const load = useCallback(() => port.listPosts(), [port])

  return useList(load)
}
