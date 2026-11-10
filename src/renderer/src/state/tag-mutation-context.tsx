/* eslint-disable react-refresh/only-export-components -- context and its provider share the same seam */
import { createContext, useContext, useState, type JSX, type ReactNode } from 'react'
import { TagMutations } from './tag-mutations'

const Context = createContext(new TagMutations())

export function TagMutationProvider({ children }: { children: ReactNode }): JSX.Element {
  const [mutations] = useState(() => new TagMutations())
  return <Context.Provider value={mutations}>{children}</Context.Provider>
}

export function useTagMutations(): TagMutations {
  return useContext(Context)
}
