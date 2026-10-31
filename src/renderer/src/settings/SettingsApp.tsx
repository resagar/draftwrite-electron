import { useEffect, type JSX } from 'react'
import { Settings } from './Settings'
import { TypographyProvider } from './typography-context'

export function SettingsApp(): JSX.Element {
  useEffect(() => {
    document.title = 'Settings — DraftWrite'
  }, [])
  return (
    <TypographyProvider settingsWindow>
      <Settings />
    </TypographyProvider>
  )
}
