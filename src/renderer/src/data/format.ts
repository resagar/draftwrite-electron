const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const JUST_NOW_MS = 60_000

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  if (now.getTime() - date.getTime() < JUST_NOW_MS) {
    return 'Just now'
  }

  if (isSameDay(date, now)) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) {
    return 'Yesterday'
  }

  const monthDay = `${MONTHS[date.getMonth()]} ${date.getDate()}`
  if (date.getFullYear() === now.getFullYear()) {
    return monthDay
  }

  return `${monthDay}, ${date.getFullYear()}`
}

const WORDS_PER_MINUTE = 200

export function countWords(text: string): number {
  const trimmed = text.trim()

  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

export function countCharacters(text: string): number {
  return text.length
}

export function readingTimeMinutes(words: number): number {
  if (words === 0) {
    return 0
  }

  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

export function excerpt(text: string, maxLength = 240): string {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= maxLength) {
    return collapsed
  }

  return `${collapsed.slice(0, maxLength).trimEnd()}…`
}
