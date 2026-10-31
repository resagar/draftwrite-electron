import { render, type RenderResult } from '@testing-library/react'
import type { DataPort } from '../data/port'
import { DataPortProvider } from '../data/port-context'
import { SettingsApp } from '../settings/SettingsApp'

/** A second renderer root; native window behavior is exercised in Electron. */
export function renderSettings(port: DataPort): RenderResult {
  return render(
    <DataPortProvider port={port}>
      <SettingsApp />
    </DataPortProvider>
  )
}
