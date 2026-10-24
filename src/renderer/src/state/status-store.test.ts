import { beforeEach, describe, expect, it } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'
import {
  publishStatus,
  resetStatus,
  selectPreviewLine,
  usePreviewLine,
  type EditorStatus
} from './status-store'

const statusWith = (cursor: EditorStatus['cursor']): EditorStatus => ({
  save: 'idle',
  words: 0,
  characters: 0,
  readingMinutes: 0,
  cursor
})

describe('usePreviewLine', () => {
  beforeEach(() => {
    resetStatus()
  })

  it('returns null until the editor publishes a cursor', () => {
    const { result } = renderHook(() => usePreviewLine())

    expect(result.current).toBeNull()
  })

  it('returns the line of the published cursor', () => {
    const { result } = renderHook(() => usePreviewLine())

    act(() => {
      publishStatus({ cursor: { line: 12, column: 4, origin: 'keyboard' } })
    })

    expect(result.current).toBe(12)
  })

  it('does not re-render when only the column changes', () => {
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1

      return usePreviewLine()
    })

    act(() => {
      publishStatus({ cursor: { line: 12, column: 4, origin: 'keyboard' } })
    })
    const afterLine = renders

    act(() => {
      publishStatus({ cursor: { line: 12, column: 9, origin: 'keyboard' } })
    })

    expect(renders).toBe(afterLine)
    expect(result.current).toBe(12)
  })

  it('re-renders when the line changes', () => {
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1

      return usePreviewLine()
    })

    act(() => {
      publishStatus({ cursor: { line: 12, column: 4, origin: 'keyboard' } })
    })
    const afterFirstLine = renders

    act(() => {
      publishStatus({ cursor: { line: 13, column: 1, origin: 'keyboard' } })
    })

    expect(renders).toBeGreaterThan(afterFirstLine)
    expect(result.current).toBe(13)
  })

  it('returns null again when the editor drops the cursor', () => {
    const { result } = renderHook(() => usePreviewLine())

    act(() => {
      publishStatus({ cursor: { line: 3, column: 1, origin: 'keyboard' } })
    })
    act(() => {
      publishStatus({ cursor: null })
    })

    expect(result.current).toBeNull()
  })

  it('follows a caret settled by the pointer', () => {
    const { result } = renderHook(() => usePreviewLine())

    act(() => {
      publishStatus({ cursor: { line: 7, column: 2, origin: 'pointer' } })
    })

    expect(result.current).toBe(7)
  })

  it('does not re-render when a pointer caret lands on the same line', () => {
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1

      return usePreviewLine()
    })

    act(() => {
      publishStatus({ cursor: { line: 7, column: 2, origin: 'keyboard' } })
    })
    const afterFirstCursor = renders

    act(() => {
      publishStatus({ cursor: { line: 7, column: 11, origin: 'pointer' } })
    })

    expect(renders).toBe(afterFirstCursor)
    expect(result.current).toBe(7)
  })
})

describe('selectPreviewLine', () => {
  it('returns the line of a caret moved by the keyboard', () => {
    expect(selectPreviewLine(statusWith({ line: 3, column: 1, origin: 'keyboard' }))).toBe(3)
  })

  it('returns the line of a caret settled by the pointer', () => {
    expect(selectPreviewLine(statusWith({ line: 9, column: 4, origin: 'pointer' }))).toBe(9)
  })

  it('returns null only when there is no cursor', () => {
    expect(selectPreviewLine(statusWith(null))).toBeNull()
  })
})
