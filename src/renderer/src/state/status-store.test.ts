import { beforeEach, describe, expect, it } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'
import { publishStatus, resetStatus, usePreviewLine } from './status-store'

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
      publishStatus({ cursor: { line: 12, column: 4 } })
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
      publishStatus({ cursor: { line: 12, column: 4 } })
    })
    const afterLine = renders

    act(() => {
      publishStatus({ cursor: { line: 12, column: 9 } })
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
      publishStatus({ cursor: { line: 12, column: 4 } })
    })
    const afterFirstLine = renders

    act(() => {
      publishStatus({ cursor: { line: 13, column: 1 } })
    })

    expect(renders).toBeGreaterThan(afterFirstLine)
    expect(result.current).toBe(13)
  })

  it('returns null again when the editor drops the cursor', () => {
    const { result } = renderHook(() => usePreviewLine())

    act(() => {
      publishStatus({ cursor: { line: 3, column: 1 } })
    })
    act(() => {
      publishStatus({ cursor: null })
    })

    expect(result.current).toBeNull()
  })
})
