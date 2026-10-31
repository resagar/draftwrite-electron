import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { defaultPreferences, readPreferences, savePreferences } from './preferences'

beforeEach(() => localStorage.clear())

describe('typography preferences storage', () => {
  it('migrates existing preferences with independent default line heights', () => {
    localStorage.setItem(
      'draftwrite.typography',
      JSON.stringify({
        editor: { font: 'Monaspace Neon', size: 24 },
        preview: { font: 'Newsreader', size: 20, lineHeight: 1.25 },
        interface: { font: 'Inter', size: 150 }
      })
    )
    expect(readPreferences()).toEqual({
      editor: { font: 'Monaspace Neon', size: 24, lineHeight: 2 },
      preview: { font: 'Newsreader', size: 20, lineHeight: 1.25 },
      interface: { font: 'Inter', size: 150 }
    })
  })
  it('keeps independent choices across sessions', () => {
    const preferences = {
      editor: { font: 'Monaspace Neon', size: 24, lineHeight: 1.5 },
      preview: { font: 'Newsreader', size: 20, lineHeight: 1.25 },
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
      editor: { font: 'Missing font', size: 16, lineHeight: 2 },
      preview: { font: 'Inter', size: 10, lineHeight: 2 },
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

  it.each([0, -1, 3.1, Number.NaN, Number.POSITIVE_INFINITY])(
    'defaults only an invalid line height (%s)',
    (lineHeight) => {
      localStorage.setItem(
        'draftwrite.typography',
        JSON.stringify({
          editor: { font: 'Newsreader', size: 20, lineHeight },
          preview: { font: 'Inter', size: 24, lineHeight: 3 }
        })
      )
      expect(readPreferences().editor).toEqual({ font: 'Newsreader', size: 20, lineHeight: 2 })
      expect(readPreferences().preview).toEqual({ font: 'Inter', size: 24, lineHeight: 3 })
    }
  )
})

it('persists Vim mode and treats absent or corrupt flags as disabled without changing typography', () => {
  const preferences = {
    ...defaultPreferences,
    editor: { font: 'Monaspace Neon', size: 24, lineHeight: 1.25, vimMode: true }
  }
  expect(savePreferences(preferences)).toBe(true)
  expect(readPreferences()).toEqual(preferences)
  localStorage.setItem(
    'draftwrite.typography',
    JSON.stringify({ ...preferences, editor: { ...preferences.editor, vimMode: 'true' } })
  )
  expect(readPreferences().editor.vimMode ?? false).toBe(false)
  expect(readPreferences().editor).toMatchObject({
    font: 'Monaspace Neon',
    size: 24,
    lineHeight: 1.25
  })
})
