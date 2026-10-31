import { describe, expect, it } from '@jest/globals'
import { availableFont, fontCatalog } from './fonts'

describe('font catalog', () => {
  it('offers all bundled families offline and prioritizes them over system duplicates', () => {
    const catalog = fontCatalog(['inter', ' Inter ', 'Local Serif', 'Local Serif'])
    expect(catalog.filter(({ family }) => family.toLowerCase() === 'inter')).toEqual([
      { family: 'Inter', source: 'Included' }
    ])
    expect(catalog.filter(({ family }) => family === 'Local Serif')).toEqual([
      { family: 'Local Serif', source: 'System' }
    ])
    expect(
      catalog
        .filter(({ family }) => family.startsWith('Monaspace'))
        .map(({ family }) => family)
        .sort()
    ).toEqual([
      'Monaspace Argon',
      'Monaspace Krypton',
      'Monaspace Neon',
      'Monaspace Radon',
      'Monaspace Xenon'
    ])
    expect(availableFont('Local Serif', fontCatalog([]))).toBeNull()
    expect(availableFont('local serif', catalog)).toBe('Local Serif')
  })
})
