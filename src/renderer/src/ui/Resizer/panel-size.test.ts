import { beforeEach, describe, expect, it } from '@jest/globals'
import {
  canResizeSplit,
  clamp,
  ratioBounds,
  ratioFromDelta,
  ratioFromKey,
  readStoredNumber,
  sizeFromDelta,
  sizeFromKey,
  writeStoredNumber
} from './panel-size'

beforeEach(() => {
  window.localStorage.clear()
})

describe('sizeFromDelta', () => {
  it('adds the drag distance and clamps to the limits', () => {
    expect(sizeFromDelta(280, 40, 200, 420)).toBe(320)
    expect(sizeFromDelta(280, -200, 200, 420)).toBe(200)
    expect(sizeFromDelta(280, 400, 200, 420)).toBe(420)
  })
})

describe('ratioFromDelta', () => {
  it('converts the drag distance to a ratio of the container', () => {
    expect(ratioFromDelta(0.5, 100, 400, 0.2, 0.8)).toBe(0.75)
    expect(ratioFromDelta(0.5, -100, 400, 0.2, 0.8)).toBe(0.25)
  })

  it('clamps and tolerates an unmeasured container', () => {
    expect(ratioFromDelta(0.5, 400, 400, 0.2, 0.8)).toBe(0.8)
    expect(ratioFromDelta(0.5, 100, 0, 0.2, 0.8)).toBe(0.5)
  })
})

describe('ratioBounds', () => {
  it('keeps both panes at least minPanePx wide', () => {
    expect(ratioBounds(400, 0.2, 0.8, 160)).toEqual({ min: 0.4, max: 0.6 })
  })

  it('returns the configured ratios before the container is measured', () => {
    expect(ratioBounds(0, 0.2, 0.8, 160)).toEqual({ min: 0.2, max: 0.8 })
  })
})

describe('canResizeSplit', () => {
  it('allows a container with room for two minimum panes', () => {
    expect(canResizeSplit(ratioBounds(400, 0.2, 0.8, 160), 400, 160)).toBe(true)
  })

  it('refuses a container narrower than two minimum panes', () => {
    expect(canResizeSplit(ratioBounds(300, 0.2, 0.8, 160), 300, 160)).toBe(false)
  })

  it('allows resizing before the container is measured', () => {
    expect(canResizeSplit(ratioBounds(0, 0.2, 0.8, 160), 0, 160)).toBe(true)
  })
})

describe('stored values', () => {
  it('writes and reads a number with the panel prefix', () => {
    writeStoredNumber('test', 280)

    expect(window.localStorage.getItem('draftwrite.panel.test')).toBe('280')
    expect(readStoredNumber('test', 200, 100, 400)).toBe(280)
  })

  it('falls back when the stored value is missing or invalid', () => {
    expect(readStoredNumber('missing', 220, 100, 400)).toBe(220)

    window.localStorage.setItem('draftwrite.panel.bad', 'nope')
    expect(readStoredNumber('bad', 220, 100, 400)).toBe(220)
  })

  it('clamps a stored value to the current limits', () => {
    window.localStorage.setItem('draftwrite.panel.wide', '900')

    expect(readStoredNumber('wide', 220, 160, 320)).toBe(320)
  })
})

describe('keyboard steps', () => {
  it('moves a panel by one step and supports the limits', () => {
    expect(sizeFromKey('ArrowRight', 200, 16, 100, 400)).toBe(216)
    expect(sizeFromKey('ArrowLeft', 200, 16, 100, 400)).toBe(184)
    expect(sizeFromKey('Home', 200, 16, 100, 400)).toBe(100)
    expect(sizeFromKey('End', 200, 16, 100, 400)).toBe(400)
    expect(sizeFromKey('Enter', 200, 16, 100, 400)).toBeNull()
  })

  it('moves a split ratio by one step and supports the limits', () => {
    expect(ratioFromKey('ArrowRight', 0.5, 0.02, 0.2, 0.8)).toBe(0.52)
    expect(ratioFromKey('ArrowLeft', 0.5, 0.02, 0.2, 0.8)).toBe(0.48)
    expect(ratioFromKey('Home', 0.5, 0.02, 0.2, 0.8)).toBe(0.2)
    expect(ratioFromKey('End', 0.5, 0.02, 0.2, 0.8)).toBe(0.8)
    expect(ratioFromKey('Tab', 0.5, 0.02, 0.2, 0.8)).toBeNull()
  })
})

describe('clamp', () => {
  it('keeps the value inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
  })
})
