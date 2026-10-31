export type TypographyContext = 'editor' | 'preview' | 'interface'
export type TypographyChoice = {
  font: string
  size: number
  lineHeight?: number
  /** Editor only; omission is the backward-compatible disabled value. */
  vimMode?: boolean
}
export type TypographyPreferences = Record<TypographyContext, TypographyChoice>
export type TypographyPatch = { context: TypographyContext; changes: Partial<TypographyChoice> }
export type TypographySnapshot = {
  preferences: TypographyPreferences
  revision: number
  storageError: boolean
}

export const defaultPreferences: TypographyPreferences = {
  editor: { font: 'Fira Code', size: 16, lineHeight: 2 },
  preview: { font: 'Inter', size: 16, lineHeight: 2 },
  interface: { font: 'Inter', size: 100 }
}

export function sizeBounds(context: TypographyContext): { min: number; max: number } {
  return context === 'interface' ? { min: 80, max: 150 } : { min: 10, max: 40 }
}

export function validChoice(context: TypographyContext, value: unknown): TypographyChoice {
  const fallback = defaultPreferences[context]
  const choice =
    typeof value === 'object' && value !== null ? (value as Partial<TypographyChoice>) : {}
  const { min, max } = sizeBounds(context)
  return {
    ...(context === 'editor' && choice.vimMode === true ? { vimMode: true } : {}),
    ...(context === 'interface'
      ? {}
      : {
          lineHeight:
            typeof choice.lineHeight === 'number' &&
            Number.isFinite(choice.lineHeight) &&
            choice.lineHeight >= 1 &&
            choice.lineHeight <= 3
              ? choice.lineHeight
              : 2
        }),
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

export function normalizePreferences(value: unknown): TypographyPreferences {
  const stored =
    typeof value === 'object' && value !== null ? (value as Partial<TypographyPreferences>) : {}
  return {
    editor: validChoice('editor', stored.editor),
    preview: validChoice('preview', stored.preview),
    interface: validChoice('interface', stored.interface)
  }
}

/** Strict validation for updates crossing the platform boundary. */
export function applyTypographyPatch(
  current: TypographyPreferences,
  value: unknown
): TypographyPreferences {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Invalid typography update')
  const { context, changes } = value as TypographyPatch
  if (
    !['editor', 'preview', 'interface'].includes(context) ||
    typeof changes !== 'object' ||
    changes === null ||
    Array.isArray(changes)
  )
    throw new Error('Invalid typography update')
  const fields = Object.keys(changes)
  const allowed = [
    'font',
    'size',
    ...(context !== 'interface' ? ['lineHeight'] : []),
    ...(context === 'editor' ? ['vimMode'] : [])
  ]
  const { min, max } = sizeBounds(context)
  if (
    !fields.length ||
    fields.some((field) => !allowed.includes(field)) ||
    ('vimMode' in changes && typeof changes.vimMode !== 'boolean') ||
    ('font' in changes &&
      (typeof changes.font !== 'string' || !changes.font.trim() || changes.font.length > 200)) ||
    ('size' in changes &&
      (typeof changes.size !== 'number' ||
        !Number.isFinite(changes.size) ||
        changes.size < min ||
        changes.size > max)) ||
    ('lineHeight' in changes &&
      (typeof changes.lineHeight !== 'number' ||
        !Number.isFinite(changes.lineHeight) ||
        changes.lineHeight < 1 ||
        changes.lineHeight > 3))
  )
    throw new Error('Invalid typography update')
  return { ...current, [context]: validChoice(context, { ...current[context], ...changes }) }
}
