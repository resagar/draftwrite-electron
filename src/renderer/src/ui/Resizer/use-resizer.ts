import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent, PointerEvent, RefObject } from 'react'
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

/** Props a separator needs. Spread them onto `Resizer`. */
export type ResizerHandleProps = {
  label: string
  value: number
  min: number
  max: number
  valueText: string
  isResizing: boolean
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onPointerMove: (event: PointerEvent<HTMLElement>) => void
  onPointerUp: (event: PointerEvent<HTMLElement>) => void
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  onDoubleClick: (event: MouseEvent<HTMLElement>) => void
}

type DragStart = {
  pointerId: number
  startX: number
  startValue: number
}

function capturePointer(element: HTMLElement, pointerId: number): void {
  if (typeof element.setPointerCapture === 'function') {
    element.setPointerCapture(pointerId)
  }
}

function releasePointer(element: HTMLElement, pointerId: number): void {
  if (
    typeof element.releasePointerCapture === 'function' &&
    typeof element.hasPointerCapture === 'function' &&
    element.hasPointerCapture(pointerId)
  ) {
    element.releasePointerCapture(pointerId)
  }
}

function beginBodyDrag(): void {
  if (typeof document !== 'undefined') {
    document.body.style.userSelect = 'none'
  }
}

function endBodyDrag(): void {
  if (typeof document !== 'undefined') {
    document.body.style.userSelect = ''
  }
}

export type PanelResizerOptions = {
  /** Stored under `draftwrite.panel.<key>`. */
  storageKey: string
  defaultSize: number
  min: number
  max: number
  label: string
  /** Pixels per arrow key. */
  step?: number
}

export type PanelResizer = {
  size: number
  isResizing: boolean
  resizerProps: ResizerHandleProps
}

/**
 * Width of a left-hand panel, resizable from its right edge.
 *
 * The separator keeps the pointer captured while dragging, so the gesture
 * survives leaving the handle, and writes the value to localStorage.
 */
export function usePanelResizer({
  storageKey,
  defaultSize,
  min,
  max,
  label,
  step = 16
}: PanelResizerOptions): PanelResizer {
  const [stored, setStored] = useState(() => readStoredNumber(storageKey, defaultSize, min, max))
  const [isResizing, setIsResizing] = useState(false)
  const start = useRef<DragStart | null>(null)
  const size = clamp(stored, min, max)

  useEffect(() => {
    writeStoredNumber(storageKey, size)
  }, [storageKey, size])

  useEffect(() => endBodyDrag, [])

  const end = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = start.current

    if (drag === null) {
      return
    }

    releasePointer(event.currentTarget, drag.pointerId)
    start.current = null
    setIsResizing(false)
    endBodyDrag()
  }, [])

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return
      }

      event.preventDefault()
      capturePointer(event.currentTarget, event.pointerId)
      start.current = { pointerId: event.pointerId, startX: event.clientX, startValue: size }
      setIsResizing(true)
      beginBodyDrag()
    },
    [size]
  )

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const drag = start.current

      if (drag === null || drag.pointerId !== event.pointerId) {
        return
      }

      setStored(sizeFromDelta(drag.startValue, event.clientX - drag.startX, min, max))
    },
    [min, max]
  )

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const next = sizeFromKey(event.key, size, step, min, max)

      if (next === null) {
        return
      }

      event.preventDefault()
      setStored(next)
    },
    [size, step, min, max]
  )

  const onDoubleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      event.preventDefault()
      setStored(clamp(defaultSize, min, max))
    },
    [defaultSize, min, max]
  )

  return {
    size,
    isResizing,
    resizerProps: {
      label,
      value: Math.round(size),
      min,
      max,
      valueText: `${Math.round(size)} px`,
      isResizing,
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      onKeyDown,
      onDoubleClick
    }
  }
}

export type SplitResizerOptions = {
  /** Stored under `draftwrite.panel.<key>`. */
  storageKey: string
  containerRef: RefObject<HTMLElement | null>
  defaultRatio: number
  minRatio: number
  maxRatio: number
  /** Both panes keep at least this width while the container allows it. */
  minPanePx: number
  label: string
  /** Ratio per arrow key. */
  step?: number
}

export type SplitResizer = {
  ratio: number
  canResize: boolean
  isResizing: boolean
  resizerProps: ResizerHandleProps
}

type SplitDragStart = DragStart & { containerWidth: number }

/**
 * Ratio between the editor and the preview.
 *
 * The ratio is clamped so both panes keep `minPanePx`; when the container is
 * narrower than two minimum panes the handle reports `canResize === false` and
 * the caller falls back to an even split.
 */
export function useSplitResizer({
  storageKey,
  containerRef,
  defaultRatio,
  minRatio,
  maxRatio,
  minPanePx,
  label,
  step = 0.02
}: SplitResizerOptions): SplitResizer {
  const [width, setWidth] = useState(0)
  const [stored, setStored] = useState(() =>
    readStoredNumber(storageKey, defaultRatio, minRatio, maxRatio)
  )
  const [isResizing, setIsResizing] = useState(false)
  const start = useRef<SplitDragStart | null>(null)
  const widthRef = useRef(0)

  useEffect(() => {
    const element = containerRef.current

    if (element === null) {
      return
    }

    const update = (): void => {
      const next = element.clientWidth

      if (next === widthRef.current) {
        return
      }

      widthRef.current = next
      setWidth(next)
    }

    update()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(update)
    observer.observe(element)

    return () => observer.disconnect()
  }, [containerRef])

  const bounds = ratioBounds(width, minRatio, maxRatio, minPanePx)
  const canResize = canResizeSplit(bounds, width, minPanePx)
  // The rendered ratio is clamped, but the stored one keeps what the user left:
  // after a narrow window grows again, the original split comes back.
  const ratio = clamp(stored, bounds.min, bounds.max)

  useEffect(() => {
    writeStoredNumber(storageKey, stored)
  }, [storageKey, stored])

  useEffect(() => endBodyDrag, [])

  const end = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = start.current

    if (drag === null) {
      return
    }

    releasePointer(event.currentTarget, drag.pointerId)
    start.current = null
    setIsResizing(false)
    endBodyDrag()
  }, [])

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || !canResize) {
        return
      }

      event.preventDefault()
      capturePointer(event.currentTarget, event.pointerId)
      start.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startValue: ratio,
        containerWidth: containerRef.current?.clientWidth ?? width
      }
      setIsResizing(true)
      beginBodyDrag()
    },
    [canResize, containerRef, ratio, width]
  )

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const drag = start.current

      if (drag === null || drag.pointerId !== event.pointerId) {
        return
      }

      setStored(
        ratioFromDelta(
          drag.startValue,
          event.clientX - drag.startX,
          drag.containerWidth,
          bounds.min,
          bounds.max
        )
      )
    },
    [bounds.min, bounds.max]
  )

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (!canResize) {
        return
      }

      const next = ratioFromKey(event.key, ratio, step, bounds.min, bounds.max)

      if (next === null) {
        return
      }

      event.preventDefault()
      setStored(next)
    },
    [canResize, ratio, step, bounds.min, bounds.max]
  )

  const onDoubleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      event.preventDefault()
      setStored(clamp(defaultRatio, bounds.min, bounds.max))
    },
    [defaultRatio, bounds.min, bounds.max]
  )

  return {
    ratio,
    canResize,
    isResizing,
    resizerProps: {
      label,
      value: Math.round(ratio * 100),
      min: Math.round(bounds.min * 100),
      max: Math.round(bounds.max * 100),
      valueText: `${Math.round(ratio * 100)}%`,
      isResizing,
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      onKeyDown,
      onDoubleClick
    }
  }
}
