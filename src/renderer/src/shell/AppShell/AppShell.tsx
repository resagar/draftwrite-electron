import { useEffect, useRef, type JSX, type ReactNode } from 'react'
import { Settings } from '../../settings/Settings'
import { useTypography } from '../../settings/typography-context'
import { StatusBar } from '../StatusBar/StatusBar'
import { TitleBar } from '../TitleBar/TitleBar'

type AppShellProps = {
  sidebar: ReactNode
  list: ReactNode
  workspace: ReactNode
}

export function AppShell({ sidebar, list, workspace }: AppShellProps): JSX.Element {
  const { settingsOpen, setSettingsOpen } = useTypography()
  const previousFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!settingsOpen) return
    return () => {
      previousFocus.current?.focus({ preventScroll: true })
    }
  }, [settingsOpen])
  return (
    <div className="app-shell flex h-full flex-col bg-base-100 text-sm text-base-content">
      <TitleBar
        settingsOpen={settingsOpen}
        onSettings={() => {
          if (!settingsOpen && document.activeElement instanceof HTMLElement)
            previousFocus.current = document.activeElement
          setSettingsOpen(!settingsOpen)
        }}
      />
      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          className="flex min-h-0 min-w-0 flex-1"
          style={{ visibility: settingsOpen ? 'hidden' : undefined }}
          inert={settingsOpen || undefined}
          aria-hidden={settingsOpen || undefined}
        >
          {sidebar}
          {list}
          {workspace}
        </div>
        {settingsOpen && <Settings />}
      </main>
      <StatusBar />
    </div>
  )
}
