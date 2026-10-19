import { describe, expect, it } from '@jest/globals'
import { join } from 'node:path'
import { resolveDatabasePath, resolveDataDir } from './data-dir'

describe('resolveDataDir', () => {
  it('uses XDG_DATA_HOME on Linux when it is set', () => {
    expect(
      resolveDataDir({
        platform: 'linux',
        env: { XDG_DATA_HOME: '/xdg/data' },
        home: '/home/writer'
      })
    ).toBe(join('/xdg/data', 'draftwrite'))
  })

  it('falls back to ~/.local/share on Linux when XDG_DATA_HOME is missing, empty or relative', () => {
    const expected = join('/home/writer', '.local', 'share', 'draftwrite')

    expect(resolveDataDir({ platform: 'linux', env: {}, home: '/home/writer' })).toBe(expected)
    expect(
      resolveDataDir({ platform: 'linux', env: { XDG_DATA_HOME: '' }, home: '/home/writer' })
    ).toBe(expected)
    expect(
      resolveDataDir({
        platform: 'linux',
        env: { XDG_DATA_HOME: 'relative/data' },
        home: '/home/writer'
      })
    ).toBe(expected)
  })

  it('uses the userData path injected by the main process on other platforms', () => {
    const darwinUserData = '/Users/writer/Library/Application Support/draftwrite'
    const win32UserData = 'C:\\Users\\writer\\AppData\\Roaming\\draftwrite'

    expect(resolveDataDir({ platform: 'darwin', userData: darwinUserData })).toBe(darwinUserData)
    expect(resolveDataDir({ platform: 'win32', userData: win32UserData })).toBe(win32UserData)
  })

  it('fails on other platforms when no userData path is injected', () => {
    expect(() => resolveDataDir({ platform: 'darwin' })).toThrow()
  })
})

describe('resolveDatabasePath', () => {
  it('appends the database file name to the resolved data directory', () => {
    expect(resolveDatabasePath({ platform: 'linux', env: { XDG_DATA_HOME: '/xdg/data' } })).toBe(
      join('/xdg/data', 'draftwrite', 'draftwrite.db')
    )
  })
})
