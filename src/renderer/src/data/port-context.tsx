/* eslint-disable react-refresh/only-export-components -- the context, its provider and its hook are one module */
import { createContext, useContext, type JSX, type ReactNode } from 'react'
import type { DataPort } from './port'

const DataPortContext = createContext<DataPort | null>(null)

type DataPortProviderProps = {
  port: DataPort
  children: ReactNode
}

export function DataPortProvider({ port, children }: DataPortProviderProps): JSX.Element {
  return <DataPortContext.Provider value={port}>{children}</DataPortContext.Provider>
}

export function useDataPort(): DataPort {
  const port = useContext(DataPortContext)
  if (port === null) {
    throw new Error('useDataPort requires a DataPortProvider')
  }
  return port
}
