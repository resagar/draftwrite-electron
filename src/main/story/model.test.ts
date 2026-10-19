import { describe, expect, it } from '@jest/globals'
import { errTopicRequired, newStory, normaliseStory, validateStory, type Story } from './model'

const emptyStory: Story = {
  id: '',
  topic: '',
  titles: [],
  tags: [],
  text: '',
  createdAt: '',
  updatedAt: ''
}

/** Runs `fn` and returns the thrown value so sentinels can be compared by identity. */
function captureError(fn: () => unknown): unknown {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('expected the function to throw')
}

describe('newStory', () => {
  it('creates a story from the given values', () => {
    const story = newStory(
      'space opera',
      ['First draft', 'Final draft'],
      ['novel', 'scifi'],
      'A story about space.'
    )

    expect(story.id).not.toBe('')
    expect(story.topic).toBe('space opera')
    expect(story.titles).toEqual(['First draft', 'Final draft'])
    expect(story.tags).toEqual(['novel', 'scifi'])
    expect(story.text).toBe('A story about space.')
  })

  it('only requires a topic', () => {
    const story = newStory('space opera', [], [], '')

    expect(story.id).not.toBe('')
    expect(story.topic).toBe('space opera')
    expect(story.text).toBe('')
    expect(story.titles).toEqual([])
    expect(story.tags).toEqual([])
  })

  it('never returns nil lists', () => {
    const story = newStory('topic', [], [], '')

    expect(story.titles).not.toBeNull()
    expect(story.titles).not.toBeUndefined()
    expect(story.tags).not.toBeNull()
    expect(story.tags).not.toBeUndefined()
  })

  it('trims values and drops blanks', () => {
    const story = newStory('  space opera  ', [' First ', '  ', 'Second'], [' novel '], '  text  ')

    expect(story.topic).toBe('space opera')
    expect(story.titles).toEqual(['First', 'Second'])
    expect(story.tags).toEqual(['novel'])
    expect(story.text).toBe('text')
  })

  it('rejects a missing or blank topic', () => {
    // Go subcases: "topic required" ("") and "topic blank" ("   ").
    expect(captureError(() => newStory('', [], [], ''))).toBe(errTopicRequired)
    expect(captureError(() => newStory('   ', [], [], ''))).toBe(errTopicRequired)
  })
})

describe('normaliseStory', () => {
  it('trims the values for storage', () => {
    const normalised = normaliseStory({
      ...emptyStory,
      topic: '  space opera  ',
      titles: [' First ', '', '  '],
      tags: [' novel '],
      text: '  body  '
    })

    expect(normalised.topic).toBe('space opera')
    expect(normalised.titles).toEqual(['First'])
    expect(normalised.tags).toEqual(['novel'])
    expect(normalised.text).toBe('body')
  })
})

describe('validateStory', () => {
  it('requires a topic', () => {
    // Go subcases: "topic set", "topic required" and "topic blank".
    expect(() => validateStory({ ...emptyStory, topic: 'topic' })).not.toThrow()
    expect(captureError(() => validateStory(emptyStory))).toBe(errTopicRequired)
    expect(captureError(() => validateStory({ ...emptyStory, topic: '   ' }))).toBe(
      errTopicRequired
    )
  })
})
