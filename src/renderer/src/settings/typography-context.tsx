/* eslint-disable react-refresh/only-export-components -- the context, its provider and its hook are one module */
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import { useDataPort } from '../data/port-context'
import { availableFont, cssFont, fontCatalog } from './fonts'
import type { FontFamily } from './fonts'
import { defaultPreferences, readPreferences, savePreferences, validChoice } from './preferences'
import type { TypographyChoice, TypographyContext, TypographyPreferences } from './preferences'

type TypographyState = {
  preferences: TypographyPreferences
  catalog: FontFamily[]
  catalogError: boolean
  loading: boolean
  storageError: boolean
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  update: (context: TypographyContext, choice: TypographyChoice) => void
}

const Typography = createContext<TypographyState | null>(null)

export function useTypography(): TypographyState {
  const value = useContext(Typography)
  if (value === null) throw new Error('TypographyProvider is required')
  return value
}

export function TypographyProvider({ children }: { children: ReactNode }): JSX.Element {
  const port = useDataPort()
  const [preferences, setPreferences] = useState(readPreferences)
  const [catalog, setCatalog] = useState(() => fontCatalog([]))
  const [catalogError, setCatalogError] = useState(false)
  const [loading, setLoading] = useState(() =>
    Object.values(preferences).some(({ font }) => availableFont(font, fontCatalog([])) === null)
  )
  const [storageError, setStorageError] = useState(false)
  const [settingsOpen, setOpen] = useState(false)
  const setSettingsOpen = useCallback((open: boolean) => {
    if (open) setLoading(true)
    setOpen(open)
  }, [])

  useEffect(() => {
    if (
      !settingsOpen &&
      Object.values(preferences).every(({ font }) => availableFont(font, fontCatalog([])) !== null)
    )
      return
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
    // Preferences are refreshed when settings opens, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [port, settingsOpen])

  const update = useCallback(
    (context: TypographyContext, choice: TypographyChoice) => {
      const next = { ...preferences, [context]: validChoice(context, choice) }
      setPreferences(next)
      setStorageError(!savePreferences(next))
    },
    [preferences]
  )

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
      '--ui-scale': String(preferences.interface.size / 100)
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
        settingsOpen,
        setSettingsOpen,
        update
      }}
    >
      {children}
    </Typography.Provider>
  )
}
