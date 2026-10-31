import { useState, type JSX, type ReactNode } from 'react'
import { useDataPort } from '../../data/port-context'
import { useTypography } from '../../settings/typography-context'
import { StatusBar } from '../StatusBar/StatusBar'
import { TitleBar } from '../TitleBar/TitleBar'

type AppShellProps = { sidebar: ReactNode; list: ReactNode; workspace: ReactNode }

export function AppShell({ sidebar, list, workspace }: AppShellProps): JSX.Element {
  const port = useDataPort()
  const { ready, error: sessionError } = useTypography()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="app-shell flex h-full flex-col bg-base-100 text-sm text-base-content">
      <TitleBar
        settingsReady={ready}
        onSettings={() => {
          setError(null)
          void port.openSettings().catch(() => setError('Settings could not be opened. Try again.'))
        }}
      />
      {(error || sessionError) && (
        <p role="alert" className="bg-base-200 px-4 py-2 text-error">
          {error ?? sessionError}
        </p>
      )}
      <main className="flex min-h-0 flex-1 overflow-hidden">
        {sidebar}
        {list}
        {workspace}
      </main>
      <StatusBar />
    </div>
  )
}
