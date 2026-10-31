import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { defaultPreferences, readPreferences, savePreferences } from './preferences'

beforeEach(() => localStorage.clear())

describe('typography preferences storage', () => {
  it('keeps independent choices across sessions', () => {
    const preferences = {
      editor: { font: 'Monaspace Neon', size: 24 },
      preview: { font: 'Newsreader', size: 20 },
      interface: { font: 'Inter', size: 150 }
    }
    expect(savePreferences(preferences)).toBe(true)
    expect(readPreferences()).toEqual(preferences)
  })

  it('recovers defaults from corrupt storage and rejects invalid individual fields', () => {
    localStorage.setItem('draftwrite.typography', '{broken')
    expect(readPreferences()).toEqual(defaultPreferences)
    localStorage.setItem(
      'draftwrite.typography',
      JSON.stringify({
        editor: { font: 'Missing font', size: 41 },
        preview: { font: '', size: 10 },
        interface: { font: 'Inter', size: 79 }
      })
    )
    expect(readPreferences()).toEqual({
      editor: { font: 'Missing font', size: 16 },
      preview: { font: 'Inter', size: 10 },
      interface: { font: 'Inter', size: 100 }
    })
  })

  it('survives blocked storage and reports unsuccessful writes', () => {
    const read = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readPreferences()).toEqual(defaultPreferences)
    read.mockRestore()
    const write = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    expect(savePreferences(defaultPreferences)).toBe(false)
    write.mockRestore()
  })
})
