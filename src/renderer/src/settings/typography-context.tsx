/* eslint-disable react-refresh/only-export-components -- the context, its provider and its hook are one module */
import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import { useDataPort } from '../data/port-context'
import { availableFont, cssFont, fontCatalog } from './fonts'
import type { FontFamily } from './fonts'
import { defaultPreferences } from './preferences'
import { useTypographySession } from './use-typography-session'
import type { TypographyChoice, TypographyContext, TypographyPreferences } from './preferences'

type TypographyState = {
  preferences: TypographyPreferences
  catalog: FontFamily[]
  catalogError: boolean
  loading: boolean
  storageError: boolean
  ready: boolean
  error: string | null
  update: (context: TypographyContext, changes: Partial<TypographyChoice>) => void
}

const Typography = createContext<TypographyState | null>(null)

export function useTypography(): TypographyState {
  const value = useContext(Typography)
  if (value === null) throw new Error('TypographyProvider is required')
  return value
}

export function TypographyProvider({
  children,
  settingsWindow = false
}: {
  children: ReactNode
  settingsWindow?: boolean
}): JSX.Element {
  const port = useDataPort()
  const { preferences, storageError, ready, error, update } = useTypographySession(settingsWindow)
  const needsSystemFonts = Object.values(preferences).some(
    ({ font }) => availableFont(font, fontCatalog([])) === null
  )
  const [catalog, setCatalog] = useState(() => fontCatalog([]))
  const [catalogError, setCatalogError] = useState(false)
  const [loading, setLoading] = useState(() => settingsWindow || needsSystemFonts)

  useEffect(() => {
    if (!settingsWindow && !needsSystemFonts) return
    let active = true
    void port
      .listFontFamilies()
      .then((families) => {
        if (!active) return
        setCatalog(fontCatalog(families))
        setCatalogError(false)
      })
      .catch(() => {
        if (!active) return
        setCatalogError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [port, settingsWindow, needsSystemFonts, preferences])

  useLayoutEffect(() => {
    const style = document.documentElement.style
    const effective = (context: TypographyContext): string =>
      availableFont(preferences[context].font, catalog) ?? defaultPreferences[context].font
    const values: Record<string, string> = {
      '--font-sans': `${JSON.stringify(effective('interface'))}, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
      '--editor-font': cssFont(effective('editor')),
      '--preview-font': cssFont(effective('preview')),
      '--preview-emphasis-font':
        effective('preview') === 'Inter'
          ? '"Newsreader", Georgia, serif'
          : cssFont(effective('preview')),
      '--editor-size': `${preferences.editor.size}px`,
      '--preview-size': `${preferences.preview.size}px`,
      '--ui-scale': String(preferences.interface.size / 100),
      '--editor-line-height': String(preferences.editor.lineHeight ?? 2),
      '--preview-line-height': String(preferences.preview.lineHeight ?? 2)
    }
    for (const [name, value] of Object.entries(values)) style.setProperty(name, value)
    return () => {
      for (const name of Object.keys(values)) style.removeProperty(name)
    }
  }, [preferences, catalog])

  return (
    <Typography.Provider
      value={{
        preferences,
        catalog,
        catalogError,
        loading,
        storageError,
        ready,
        error,
        update
      }}
    >
      {children}
    </Typography.Provider>
  )
}
