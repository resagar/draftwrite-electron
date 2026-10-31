export type FontFamily = { family: string; source: 'Included' | 'System' }

export const includedFonts = [
  'Inter',
  'Fira Code',
  'Newsreader',
  'Monaspace Neon',
  'Monaspace Argon',
  'Monaspace Xenon',
  'Monaspace Radon',
  'Monaspace Krypton'
]

export function fontCatalog(system: string[]): FontFamily[] {
  const families = new Map<string, FontFamily>()
  for (const family of includedFonts) {
    families.set(family.toLowerCase(), { family, source: 'Included' })
  }
  for (const raw of system) {
    const family = raw.trim()
    if (family && family.length <= 200 && !families.has(family.toLowerCase())) {
      families.set(family.toLowerCase(), { family, source: 'System' })
    }
  }
  return [...families.values()]
}

export function availableFont(font: string, catalog: FontFamily[]): string | null {
  return catalog.find(({ family }) => family.toLowerCase() === font.toLowerCase())?.family ?? null
}

export function cssFont(font: string): string {
  return `${JSON.stringify(font)}, sans-serif`
}
