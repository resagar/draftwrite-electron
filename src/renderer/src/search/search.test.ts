import { describe, expect, it } from '@jest/globals'
import { makeArticle, makePost, makeStory } from '../data/fake/factories'
import {
  buildEntries,
  groupResults,
  searchEntries,
  type LibrarySnapshot,
  type SearchGroup
} from './search'

const stories = [
  makeStory({
    ID: 's1',
    Topic: 'Canción de cuna',
    Titles: ['Lullaby'],
    Tags: ['music'],
    Text: 'A quiet song',
    UpdatedAt: '2024-10-10T10:00:00'
  }),
  makeStory({
    ID: 's2',
    Topic: 'Silent software',
    Titles: [],
    Tags: ['tech'],
    Text: 'About calm interfaces',
    UpdatedAt: '2024-10-12T10:00:00'
  })
]

const articles = [
  makeArticle({
    ID: 'a1',
    StoryID: 's1',
    Title: 'Night tune',
    Subtitle: 'Soft',
    Target: 'Sleep',
    Text: 'Needle in the body',
    UpdatedAt: '2024-10-13T10:00:00'
  }),
  makeArticle({
    ID: 'a2',
    StoryID: 's2',
    Title: 'Quiet tools',
    Subtitle: 'Plain',
    Target: 'Focus',
    Text: 'No noise',
    UpdatedAt: '2024-10-11T10:00:00'
  })
]

const posts = [
  makePost({
    ID: 'p1',
    Topic: 'Launch note',
    Text: 'Shipping soon',
    State: 'scheduled',
    StoryID: 's2',
    UpdatedAt: '2024-10-14T10:00:00'
  })
]

const library: LibrarySnapshot = { stories, articles, posts }

function search(query: string): SearchGroup[] {
  return groupResults(searchEntries(buildEntries(library), query))
}

function ids(groups: SearchGroup[]): string[] {
  return groups.flatMap((group) => group.results.map((result) => result.entry.id))
}

describe('library search', () => {
  it('groups every collection by kind and orders each group by most recently updated', () => {
    const groups = search('')

    expect(groups.map((group) => group.label)).toEqual(['Stories', 'Articles', 'Posts'])
    expect(ids(groups)).toEqual(['s2', 's1', 'a1', 'a2', 'p1'])
  })

  it('ignores case and accents', () => {
    const groups = search('CANCION')

    expect(ids(groups)).toEqual(['s1', 'a1'])
  })

  it('highlights the characters that matched the title', () => {
    const groups = search('night')

    expect(groups[0].results[0].titleMatches).toEqual([0, 1, 2, 3, 4])
    expect(groups[0].results[0].entry.title).toBe('Night tune')
  })

  it('requires every term to match somewhere', () => {
    expect(ids(search('cancion cuna'))).toEqual(['s1', 'a1'])
    expect(search('cancion software')).toEqual([])
  })

  it('finds articles and posts through the topic of their source story', () => {
    const groups = search('silent')

    expect(ids(groups)).toEqual(['s2', 'a2', 'p1'])
    expect(
      groups.flatMap((group) => group.results).find((result) => result.entry.id === 'a2')?.entry
        .context
    ).toBe('Silent software')
  })

  it('finds stories by candidate titles and tags', () => {
    expect(ids(search('lullaby'))).toEqual(['s1', 'a1'])
    expect(ids(search('tech'))).toEqual(['s2', 'a2', 'p1'])
  })

  it('matches tags as a subsequence', () => {
    expect(ids(search('tch'))).toEqual(['s2', 'a2', 'p1'])
  })

  it('finds articles by subtitle and target', () => {
    expect(ids(search('plain'))).toEqual(['a2'])
    expect(ids(search('sleep'))).toEqual(['a1'])
  })

  it('searches inside the text of every entity', () => {
    expect(ids(search('needle'))).toEqual(['a1'])
    expect(ids(search('shipping'))).toEqual(['p1'])
  })

  it('ranks identifier matches above text matches', () => {
    const results = searchEntries(buildEntries(library), 'quiet')

    expect(results.map((result) => result.entry.id)).toEqual(['a2', 's1'])
  })

  it('returns no groups when nothing matches', () => {
    expect(search('nothing-here')).toEqual([])
  })

  it('labels a post with its editorial state', () => {
    const post = search('launch')[0].results[0].entry

    expect(post.context).toBe('Scheduled')
    expect(post.state).toBe('scheduled')
  })
})
