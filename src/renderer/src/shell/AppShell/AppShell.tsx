import type { WindowChrome } from '../TitleBar/use-window-chrome'
import { useState, type JSX, type ReactNode } from 'react'
import { useDataPort } from '../../data/port-context'
import { useTypography } from '../../settings/typography-context'
import { StatusBar } from '../StatusBar/StatusBar'
import { TitleBar } from '../TitleBar/TitleBar'

type AppShellProps = {
  chrome: WindowChrome
  sidebar: ReactNode
  list: ReactNode
  workspace: ReactNode
}

export function AppShell({ chrome, sidebar, list, workspace }: AppShellProps): JSX.Element {
  const port = useDataPort()
  const { ready, error: sessionError } = useTypography()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="app-shell flex h-full bg-base-100 text-sm text-base-content">
      {sidebar}
      {list}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TitleBar
          chrome={chrome}
          settingsReady={ready}
          onSettings={() => {
            setError(null)
            void port
              .openSettings()
              .catch(() => setError('Settings could not be opened. Try again.'))
          }}
        />
        {(error || sessionError || chrome.error) && (
          <p role="alert" className="bg-base-200 px-4 py-2 text-error">
            {error ?? sessionError ?? chrome.error}
          </p>
        )}
        <main className="flex min-h-0 flex-1 overflow-hidden">{workspace}</main>
        <StatusBar />
      </div>
    </div>
  )
}
