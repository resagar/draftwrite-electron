import { describe, expect, it } from '@jest/globals'
import { modifierFor } from './use-platform'

describe('modifierFor', () => {
  it('uses the command key on Apple platforms', () => {
    expect(
      modifierFor(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
      )
    ).toBe('⌘')
  })

  it('uses control everywhere else', () => {
    expect(
      modifierFor('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36')
    ).toBe('Ctrl')
    expect(
      modifierFor('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36')
    ).toBe('Ctrl')
  })
})
