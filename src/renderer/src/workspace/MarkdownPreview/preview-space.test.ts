import { describe, expect, it } from '@jest/globals'
import { bottomSpaceForLastLine } from './preview-space'

describe('bottomSpaceForLastLine', () => {
  it('leaves room for the last line to reach the top edge', () => {
    // H = 500, A = 1000, lastLineTop = 980: 500 - (1000 - 980).
    expect(bottomSpaceForLastLine(500, 1000, 980)).toBe(480)
  })

  it('clamps to zero when the distance below the last line already fills the viewport', () => {
    // H = 500, A - lastLineTop = 900: 500 - 900 < 0.
    expect(bottomSpaceForLastLine(500, 1000, 100)).toBe(0)
  })

  it('is zero without a viewport', () => {
    expect(bottomSpaceForLastLine(0, 1000, 980)).toBe(0)
  })
})
