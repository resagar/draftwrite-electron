import type { JSX, ReactNode } from 'react'
import { StatusBar } from '../StatusBar/StatusBar'
import { TitleBar } from '../TitleBar/TitleBar'

type AppShellProps = {
  sidebar: ReactNode
  list: ReactNode
  workspace: ReactNode
}

export function AppShell({ sidebar, list, workspace }: AppShellProps): JSX.Element {
  return (
    <div className="flex h-full flex-col bg-base-100 text-sm text-base-content">
      <TitleBar />
      <main className="flex min-h-0 flex-1 overflow-hidden">
        {sidebar}
        {list}
        {workspace}
      </main>
      <StatusBar />
    </div>
  )
}
