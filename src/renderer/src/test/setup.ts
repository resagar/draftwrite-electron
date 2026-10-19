import { afterEach } from '@jest/globals'
import { cleanup } from '@testing-library/react'

// jsdom does not implement the range measurement CodeMirror relies on.
if (typeof Range !== 'undefined') {
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    value: () => ({
      length: 0,
      item: () => null,
      [Symbol.iterator]: [][Symbol.iterator]
    })
  })

  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      toJSON: () => ({})
    })
  })
}

afterEach(() => {
  cleanup()
})
