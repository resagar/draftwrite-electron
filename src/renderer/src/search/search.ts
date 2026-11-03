import type { Article, Post, PostState, Story } from '../data/types'
import { POST_STATE_LABELS } from '../data/post-state'

export type EntryKind = 'story' | 'article' | 'post'

export type SearchEntry = {
  kind: EntryKind
  id: string
  title: string
  context: string | null
  text: string
  tags: string[]
  state: PostState | null
  updatedAt: string
  // Short identifiers are matched as a subsequence; bodies only as a substring.
  identifiers: string[]
  bodies: string[]
}

export type SearchResult = {
  entry: SearchEntry
  score: number
  titleMatches: number[]
}

export type SearchGroup = {
  kind: EntryKind
  label: string
  results: SearchResult[]
}

export type LibrarySnapshot = {
  stories: Story[]
  articles: Article[]
  posts: Post[]
}

const KIND_ORDER: Record<EntryKind, number> = { story: 0, article: 1, post: 2 }
export const ENTRY_KIND_LABELS: Record<EntryKind, string> = {
  story: 'Stories',
  article: 'Articles',
  post: 'Posts'
}
export const ENTRY_KIND_NAMES: Record<EntryKind, string> = {
  story: 'Story',
  article: 'Article',
  post: 'Post'
}

const IDENTIFIER_WEIGHT = 100
const TAG_WEIGHT = 60
const CONTEXT_WEIGHT = 40
const BODY_WEIGHT = 20
const MAX_POSITION_BONUS = 20

function normalise(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

// Returns the indexes in `target` where the characters of `query` appear in
// order, or null when they do not. Both strings must already be normalised.
function fuzzyMatch(query: string, target: string): number[] | null {
  if (query === '') {
    return []
  }

  const matches: number[] = []
  let position = 0

  for (let index = 0; index < target.length; index += 1) {
    if (target[index] === query[position]) {
      matches.push(index)
      position += 1

      if (position === query.length) {
        return matches
      }
    }
  }

  return null
}

function positionBonus(index: number): number {
  return Math.max(0, MAX_POSITION_BONUS - index)
}

function byRecency(left: SearchEntry, right: SearchEntry): number {
  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
}

export function buildEntries({ stories, articles, posts }: LibrarySnapshot): SearchEntry[] {
  const storyById = new Map(stories.map((story) => [story.ID, story]))
  const articleById = new Map(articles.map((article) => [article.ID, article]))

  const storyEntries = stories.map<SearchEntry>((story) => ({
    kind: 'story',
    id: story.ID,
    title: story.Topic,
    context: null,
    text: story.Text,
    tags: story.Tags,
    state: null,
    updatedAt: story.UpdatedAt,
    identifiers: [story.Topic, ...story.Titles],
    bodies: [story.Text]
  }))

  const articleEntries = articles.map<SearchEntry>((article) => {
    const story = storyById.get(article.StoryID)

    return {
      kind: 'article',
      id: article.ID,
      title: article.Title,
      context: story?.Topic ?? null,
      text: article.Text,
      tags: [],
      state: null,
      updatedAt: article.UpdatedAt,
      identifiers: [
        article.Title,
        article.Subtitle,
        article.Target,
        ...(story ? [story.Topic, ...story.Titles, ...story.Tags] : [])
      ],
      bodies: [article.Text]
    }
  })

  const postEntries = posts.map<SearchEntry>((post) => {
    const story = post.StoryID === null ? null : (storyById.get(post.StoryID) ?? null)
    const article = post.ArticleID === null ? null : (articleById.get(post.ArticleID) ?? null)

    return {
      kind: 'post',
      id: post.ID,
      title: post.Topic,
      context: POST_STATE_LABELS[post.State],
      text: post.Text,
      tags: story?.Tags ?? [],
      state: post.State,
      updatedAt: post.UpdatedAt,
      identifiers: [
        post.Topic,
        ...(story ? [story.Topic, ...story.Titles, ...story.Tags] : []),
        ...(article ? [article.Title, article.Subtitle, article.Target] : [])
      ],
      bodies: [post.Text]
    }
  })

  return [...storyEntries, ...articleEntries, ...postEntries]
}

function scoreToken(
  entry: SearchEntry,
  token: string
): { score: number; titleMatches: number[] } | null {
  let best = -1
  let titleMatches: number[] = []

  const titleMatchesForToken = fuzzyMatch(token, normalise(entry.title))
  if (titleMatchesForToken !== null) {
    best = IDENTIFIER_WEIGHT + positionBonus(titleMatchesForToken[0] ?? 0)
    titleMatches = titleMatchesForToken
  }

  for (const identifier of entry.identifiers) {
    const matches = fuzzyMatch(token, normalise(identifier))
    if (matches === null) {
      continue
    }

    const score = IDENTIFIER_WEIGHT + positionBonus(matches[0] ?? 0)
    if (score > best) {
      best = score
    }
  }

  for (const tag of entry.tags) {
    const matches = fuzzyMatch(token, normalise(tag))
    if (matches !== null) {
      best = Math.max(best, TAG_WEIGHT + positionBonus(matches[0] ?? 0))
    }
  }

  if (entry.context !== null) {
    const index = normalise(entry.context).indexOf(token)
    if (index >= 0) {
      best = Math.max(best, CONTEXT_WEIGHT + positionBonus(index))
    }
  }

  for (const body of entry.bodies) {
    const index = normalise(body).indexOf(token)
    if (index >= 0) {
      best = Math.max(best, BODY_WEIGHT + positionBonus(index))
    }
  }

  return best < 0 ? null : { score: best, titleMatches }
}

export function searchEntries(entries: SearchEntry[], query: string): SearchResult[] {
  const tokens = normalise(query)
    .split(/\s+/)
    .filter((token) => token !== '')

  if (tokens.length === 0) {
    return [...entries].sort(byRecency).map((entry) => ({ entry, score: 0, titleMatches: [] }))
  }

  const results: SearchResult[] = []

  for (const entry of entries) {
    let score = 0
    const titleMatches = new Set<number>()

    for (const token of tokens) {
      const matched = scoreToken(entry, token)
      if (matched === null) {
        score = -1
        break
      }

      score += matched.score
      for (const index of matched.titleMatches) {
        titleMatches.add(index)
      }
    }

    if (score >= 0) {
      results.push({
        entry,
        score,
        titleMatches: [...titleMatches].sort((left, right) => left - right)
      })
    }
  }

  return results.sort(
    (left, right) =>
      right.score - left.score ||
      byRecency(left.entry, right.entry) ||
      KIND_ORDER[left.entry.kind] - KIND_ORDER[right.entry.kind] ||
      left.entry.id.localeCompare(right.entry.id)
  )
}

export function groupResults(results: SearchResult[]): SearchGroup[] {
  return (['story', 'article', 'post'] as const)
    .map((kind) => ({
      kind,
      label: ENTRY_KIND_LABELS[kind],
      results: results.filter((result) => result.entry.kind === kind)
    }))
    .filter((group) => group.results.length > 0)
}
