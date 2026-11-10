import type { CSSProperties } from 'react'
import type { TagColor } from '../../../shared/tags'

const colors: Record<TagColor, string> = {
  default: 'var(--color-base-content)',
  red: 'var(--rp-love)',
  orange: 'var(--rp-rose)',
  yellow: 'var(--rp-gold)',
  olive: 'color-mix(in srgb, var(--rp-gold), var(--rp-pine))',
  green: 'color-mix(in srgb, var(--rp-foam), var(--rp-gold))',
  teal: 'var(--rp-foam)',
  blue: 'var(--rp-pine)',
  violet: 'var(--rp-iris)',
  purple: 'color-mix(in srgb, var(--rp-iris), var(--rp-love))',
  pink: 'color-mix(in srgb, var(--rp-love), var(--rp-rose))',
  brown: 'color-mix(in srgb, var(--rp-rose), var(--rp-gold))',
  grey: 'var(--color-base-content)',
  black: 'var(--color-neutral)'
}
export function tagStyle(color: TagColor = 'default'): CSSProperties {
  return { '--tag-color': colors[color] ?? colors.default } as CSSProperties
}
