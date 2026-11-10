import { isTagColor, type TagColor } from '../../shared/tags'

export const errTagNameInvalid = Object.assign(new Error('Invalid tag name'), {
  code: 'errTagNameInvalid'
})
export const errTagColorInvalid = Object.assign(new Error('Invalid tag color'), {
  code: 'errTagColorInvalid'
})

export function validateTagName(name: string): void {
  if (!name.trim() || name !== name.trim() || name.includes(',')) throw errTagNameInvalid
}

export function validateTagColor(color: TagColor): void {
  if (!isTagColor(color)) throw errTagColorInvalid
}
