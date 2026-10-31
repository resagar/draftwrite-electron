export type TypographyContext = 'editor' | 'preview' | 'interface'
export type TypographyChoice = { font: string; size: number }
export type TypographyPreferences = Record<TypographyContext, TypographyChoice>

export const defaultPreferences: TypographyPreferences = {
  editor: { font: 'Fira Code', size: 16 },
  preview: { font: 'Inter', size: 16 },
  interface: { font: 'Inter', size: 100 }
}

export function sizeBounds(context: TypographyContext): { min: number; max: number } {
  return context === 'interface' ? { min: 80, max: 150 } : { min: 10, max: 40 }
}

export function validChoice(context: TypographyContext, value: unknown): TypographyChoice {
  const fallback = defaultPreferences[context]
  if (typeof value !== 'object' || value === null) return { ...fallback }
  const choice = value as Partial<TypographyChoice>
  const { min, max } = sizeBounds(context)
  return {
    font:
      typeof choice.font === 'string' && choice.font.trim() && choice.font.length <= 200
        ? choice.font.trim()
        : fallback.font,
    size:
      typeof choice.size === 'number' &&
      Number.isFinite(choice.size) &&
      choice.size >= min &&
      choice.size <= max
        ? choice.size
        : fallback.size
  }
}

const STORAGE_KEY = 'draftwrite.typography'

export function readPreferences(): TypographyPreferences {
  let stored: Partial<TypographyPreferences> | null = null
  try {
    stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    // Invalid or unavailable storage leaves the current appearance intact.
  }
  return {
    editor: validChoice('editor', stored?.editor),
    preview: validChoice('preview', stored?.preview),
    interface: validChoice('interface', stored?.interface)
  }
}

export function savePreferences(preferences: TypographyPreferences): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    return true
  } catch {
    return false
  }
}
