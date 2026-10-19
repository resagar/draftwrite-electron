import { describe, expect, it } from '@jest/globals'
import type { ArticleDTO, StoryDTO } from '../../../main/adapters/ipc/contract'
import { toArticle, toArticles, toStories, toStory } from './normalise'

const wireStory: StoryDTO = {
  id: 's1',
  topic: 'Calm software',
  titles: ['Calm'],
  tags: ['essays'],
  text: 'Raw thoughts.',
  createdAt: '2024-10-14T10:00:00',
  updatedAt: '2024-10-14T10:00:00'
}

const wireArticle: ArticleDTO = {
  id: 'a1',
  storyID: 's1',
  title: 'The architecture of calm',
  subtitle: 'On calm tools',
  target: 'Convince the reader',
  text: 'The text of the article',
  createdAt: '2024-10-14T10:00:00',
  updatedAt: '2024-10-14T10:00:00'
}

describe('toStory', () => {
  it('translates the camelCase wire into the interface shape', () => {
    expect(toStory(wireStory)).toEqual({
      ID: 's1',
      Topic: 'Calm software',
      Titles: ['Calm'],
      Tags: ['essays'],
      Text: 'Raw thoughts.',
      CreatedAt: '2024-10-14T10:00:00',
      UpdatedAt: '2024-10-14T10:00:00'
    })
  })

  it('keeps the title and tag lists the contract sends', () => {
    const story = toStory({ ...wireStory, titles: [], tags: [] })

    expect(story.Titles).toEqual([])
    expect(story.Tags).toEqual([])
  })
})

describe('toStories', () => {
  it('maps every story', () => {
    expect(toStories([wireStory])).toEqual([toStory(wireStory)])
  })

  it('maps an empty list to an empty array', () => {
    expect(toStories([])).toEqual([])
  })
})

describe('toArticle', () => {
  it('translates the camelCase wire into the interface shape', () => {
    expect(toArticle(wireArticle)).toEqual({
      ID: 'a1',
      StoryID: 's1',
      Title: 'The architecture of calm',
      Subtitle: 'On calm tools',
      Target: 'Convince the reader',
      Text: 'The text of the article',
      CreatedAt: '2024-10-14T10:00:00',
      UpdatedAt: '2024-10-14T10:00:00'
    })
  })
})

describe('toArticles', () => {
  it('maps every article', () => {
    expect(toArticles([wireArticle])).toEqual([toArticle(wireArticle)])
  })

  it('maps an empty list to an empty array', () => {
    expect(toArticles([])).toEqual([])
  })
})
