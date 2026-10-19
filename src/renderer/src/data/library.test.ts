import { describe, expect, it } from '@jest/globals'
import { makeArticle, makeStory } from './fake/factories'
import { collectTags, filterArticlesByTag, filterStoriesByTag, sortByUpdatedAt } from './library'

describe('sortByUpdatedAt', () => {
  const items = [
    makeStory({ ID: 'older', UpdatedAt: '2024-10-01T10:00:00' }),
    makeStory({ ID: 'newer', UpdatedAt: '2024-12-01T10:00:00' }),
    makeStory({ ID: 'middle', UpdatedAt: '2024-11-01T10:00:00' })
  ]

  it('puts the most recently updated first by default', () => {
    expect(sortByUpdatedAt(items, 'desc').map((item) => item.ID)).toEqual([
      'newer',
      'middle',
      'older'
    ])
  })

  it('reverses the order on demand', () => {
    expect(sortByUpdatedAt(items, 'asc').map((item) => item.ID)).toEqual([
      'older',
      'middle',
      'newer'
    ])
  })

  it('does not mutate the input', () => {
    const input = [...items]

    sortByUpdatedAt(input, 'asc')

    expect(input.map((item) => item.ID)).toEqual(['older', 'newer', 'middle'])
  })
})

describe('filterStoriesByTag', () => {
  const stories = [
    makeStory({ ID: 'essay', Tags: ['essays', 'systems'] }),
    makeStory({ ID: 'notes', Tags: ['notes'] })
  ]

  it('keeps everything when no tag is chosen', () => {
    expect(filterStoriesByTag(stories, null)).toHaveLength(2)
  })

  it('keeps only the stories carrying the tag', () => {
    expect(filterStoriesByTag(stories, 'essays').map((story) => story.ID)).toEqual(['essay'])
  })

  it('returns nothing for a tag no story carries', () => {
    expect(filterStoriesByTag(stories, 'missing')).toHaveLength(0)
  })
})

describe('filterArticlesByTag', () => {
  const stories = [
    makeStory({ ID: 'essay', Tags: ['essays'] }),
    makeStory({ ID: 'notes', Tags: ['notes'] })
  ]
  const articles = [
    makeArticle({ ID: 'from-essay', StoryID: 'essay' }),
    makeArticle({ ID: 'from-notes', StoryID: 'notes' })
  ]

  it('keeps articles whose story carries the tag', () => {
    expect(filterArticlesByTag(articles, stories, 'notes').map((article) => article.ID)).toEqual([
      'from-notes'
    ])
  })

  it('drops articles whose story is unknown', () => {
    const orphans = [makeArticle({ ID: 'orphan', StoryID: 'gone' })]

    expect(filterArticlesByTag(orphans, stories, 'essays')).toHaveLength(0)
  })
})

describe('collectTags', () => {
  it('collects the distinct tags, sorted and deduplicated', () => {
    const stories = [
      makeStory({ ID: 'a', Tags: ['systems', 'essays'] }),
      makeStory({ ID: 'b', Tags: ['essays', '  '] })
    ]

    expect(collectTags(stories)).toEqual(['essays', 'systems'])
  })
})
