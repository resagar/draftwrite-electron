/** Pure math and storage for the draggable panel separators. */

const STORAGE_PREFIX = 'draftwrite.panel.'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Width of a left panel after dragging its right edge by `delta` pixels. */
export function sizeFromDelta(startSize: number, delta: number, min: number, max: number): number {
  return clamp(startSize + delta, min, max)
}

/** Ratio of the left pane after dragging the split separator by `delta` pixels. */
export function ratioFromDelta(
  startRatio: number,
  delta: number,
  containerWidth: number,
  min: number,
  max: number
): number {
  if (containerWidth <= 0) {
    return clamp(startRatio, min, max)
  }

  return clamp(startRatio + delta / containerWidth, min, max)
}

export type RatioBounds = { min: number; max: number }

/**
 * Ratio limits that also keep both split panes at least `minPanePx` wide.
 *
 * With no measured width (jsdom, first render) the configured ratios stand; the
 * caller treats that as "resizable".
 */
export function ratioBounds(
  containerWidth: number,
  minRatio: number,
  maxRatio: number,
  minPanePx: number
): RatioBounds {
  if (containerWidth <= 0) {
    return { min: minRatio, max: maxRatio }
  }

  const reserved = minPanePx / containerWidth

  return {
    min: Math.max(minRatio, reserved),
    max: Math.min(maxRatio, 1 - reserved)
  }
}

/** A split with no room for two minimum panes cannot be dragged meaningfully. */
export function canResizeSplit(
  bounds: RatioBounds,
  containerWidth: number,
  minPanePx: number
): boolean {
  if (containerWidth <= 0) {
    return true
  }

  return containerWidth >= minPanePx * 2 && bounds.min < bounds.max
}

function storage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readStoredNumber(key: string, fallback: number, min: number, max: number): number {
  const raw = storage()?.getItem(STORAGE_PREFIX + key)

  if (raw === null || raw === undefined) {
    return clamp(fallback, min, max)
  }

  const parsed = Number.parseFloat(raw)

  return Number.isFinite(parsed) ? clamp(parsed, min, max) : clamp(fallback, min, max)
}

export function writeStoredNumber(key: string, value: number): void {
  try {
    storage()?.setItem(STORAGE_PREFIX + key, String(value))
  } catch {
    // A full or blocked storage must not break the resize.
  }
}

/** Next panel width for a separator key, or `null` when the key is not ours. */
export function sizeFromKey(
  key: string,
  size: number,
  step: number,
  min: number,
  max: number
): number | null {
  switch (key) {
    case 'ArrowLeft':
      return clamp(size - step, min, max)
    case 'ArrowRight':
      return clamp(size + step, min, max)
    case 'Home':
      return min
    case 'End':
      return max
    default:
      return null
  }
}

/** Next split ratio for a separator key, or `null` when the key is not ours. */
export function ratioFromKey(
  key: string,
  ratio: number,
  step: number,
  min: number,
  max: number
): number | null {
  switch (key) {
    case 'ArrowLeft':
      return clamp(ratio - step, min, max)
    case 'ArrowRight':
      return clamp(ratio + step, min, max)
    case 'Home':
      return min
    case 'End':
      return max
    default:
      return null
  }
}
