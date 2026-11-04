export interface TextChange {
  from: number
  to: number
  text: string
}

/** Word-level LCS with whitespace retained, bounded for long manuscripts. */
export function textChanges(before: string, after: string): TextChange[] {
  if (before === after) return []
  const a = before.match(/\s+|[^\s]+/g) ?? []
  const b = after.match(/\s+|[^\s]+/g) ?? []
  let prefix = 0
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++
  let endA = a.length
  let endB = b.length
  while (endA > prefix && endB > prefix && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }
  const offset = a.slice(0, prefix).join('').length
  const left = a.slice(prefix, endA)
  const right = b.slice(prefix, endB)
  if (left.length * right.length > 2_000_000) {
    // shortcut: very large rewrites use one conservative hunk; replace with a linear-space diff if needed.
    return [{ from: offset, to: offset + left.join('').length, text: right.join('') }]
  }
  const rows = Array.from({ length: left.length + 1 }, () => new Uint32Array(right.length + 1))
  for (let i = left.length - 1; i >= 0; i--)
    for (let j = right.length - 1; j >= 0; j--) {
      rows[i][j] =
        left[i] === right[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1])
    }
  const changes: TextChange[] = []
  let i = 0
  let j = 0
  let position = offset
  let pending: TextChange | null = null
  const flush = (): void => {
    if (pending) changes.push(pending)
    pending = null
  }
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      flush()
      position += left[i++].length
      j++
      continue
    }
    pending ??= { from: position, to: position, text: '' }
    if (j < right.length && (i === left.length || rows[i][j + 1] >= rows[i + 1][j]))
      pending.text += right[j++]
    else {
      position += left[i++].length
      pending.to = position
    }
  }
  flush()
  return changes
}

export function applyTextChanges(base: string, changes: TextChange[]): string {
  let result = base
  for (const change of [...changes].sort((a, b) => b.from - a.from))
    result = result.slice(0, change.from) + change.text + result.slice(change.to)
  return result
}

export function overlaps(
  a: Pick<TextChange, 'from' | 'to'>,
  b: Pick<TextChange, 'from' | 'to'>
): boolean {
  if (a.from === a.to || b.from === b.to) return a.from <= b.to && b.from <= a.to
  return a.from < b.to && b.from < a.to
}
