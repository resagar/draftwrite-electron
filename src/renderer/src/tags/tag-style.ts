import type { CSSProperties } from 'react'
import type { TagColor } from '../../../shared/tags'

const colors: Record<TagColor, string> = {
  default: 'var(--color-base-content)',
  red: 'var(--ctp-red)',
  orange: 'var(--ctp-peach)',
  yellow: 'var(--ctp-yellow)',
  olive: 'color-mix(in srgb, var(--ctp-yellow), var(--ctp-green))',
  green: 'var(--ctp-green)',
  teal: 'var(--ctp-teal)',
  blue: 'var(--ctp-blue)',
  violet: 'var(--ctp-lavender)',
  purple: 'var(--ctp-mauve)',
  pink: 'var(--ctp-pink)',
  brown: 'color-mix(in srgb, var(--ctp-peach), var(--ctp-overlay1))',
  grey: 'var(--ctp-subtext0)',
  black: 'var(--ctp-overlay0)'
}
export function tagStyle(color: TagColor = 'default'): CSSProperties {
  return { '--tag-color': colors[color] ?? colors.default } as CSSProperties
}
