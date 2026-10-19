const MATCHES: Array<{ marker: string; message: string }> = [
  { marker: 'topic already taken', message: 'Another story already uses that topic.' },
  { marker: 'title already taken', message: 'This story already has an article with that title.' },
  { marker: 'story id is immutable', message: 'An article cannot be moved to another story.' },
  { marker: 'story not found', message: 'The story this article belongs to no longer exists.' },
  { marker: 'topic is required', message: 'A topic is required.' },
  { marker: 'story id required', message: 'An article needs a story.' },
  { marker: 'title is required', message: 'A title is required.' },
  { marker: 'too long', message: 'One of the fields is too long (255 characters at most).' },
  { marker: 'not found', message: 'That item no longer exists.' }
]

export function describeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const lower = raw.toLowerCase()

  for (const entry of MATCHES) {
    if (lower.includes(entry.marker)) {
      return entry.message
    }
  }

  return 'Something went wrong. Please try again.'
}
