export const tagColors = [
  'default',
  'red',
  'orange',
  'yellow',
  'olive',
  'green',
  'teal',
  'blue',
  'violet',
  'purple',
  'pink',
  'brown',
  'grey',
  'black'
] as const

export type TagColor = (typeof tagColors)[number]
export type TagMetadata = { name: string; color: TagColor }
export type TagImpact = { stories: number; articles: number; posts: number }

export function isTagColor(value: unknown): value is TagColor {
  return typeof value === 'string' && (tagColors as readonly string[]).includes(value)
}
