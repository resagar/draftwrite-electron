import { render, type RenderResult } from '@testing-library/react'
import App from '../App'
import type { DataPort } from '../data/port'
import { DataPortProvider } from '../data/port-context'

export function renderApp(port: DataPort): RenderResult {
  return render(
    <DataPortProvider port={port}>
      <App />
    </DataPortProvider>
  )
}
