import { normalizePreferences } from '../../../shared/typography'
import type { TypographyPreferences } from '../../../shared/typography'
export { defaultPreferences, sizeBounds, validChoice } from '../../../shared/typography'
export type {
  TypographyContext,
  TypographyChoice,
  TypographyPreferences
} from '../../../shared/typography'

const STORAGE_KEY = 'draftwrite.typography'

export function readPreferences(): TypographyPreferences {
  let stored: Partial<TypographyPreferences> | null = null
  try {
    stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    // Invalid or unavailable storage leaves the current appearance intact.
  }
  return normalizePreferences(stored)
}

export function savePreferences(preferences: TypographyPreferences): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    return true
  } catch {
    return false
  }
}
