import { describe, expect, it } from '@jest/globals'
import {
  errScheduledAtInvalid,
  errSourceAmbiguous,
  errTopicRequired,
  newPost,
  normalisePost,
  validatePost,
  type Post
} from './model'

const emptyPost: Post = {
  id: '',
  topic: '',
  text: '',
  state: 'pending',
  scheduledAt: null,
  storyID: null,
  articleID: null,
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

describe('newPost', () => {
  it('creates a pending post from the given values', () => {
    const post = newPost('  launch note  ', '  Short body  ', null, null)

    expect(post.id).not.toBe('')
    expect(post.topic).toBe('launch note')
    expect(post.text).toBe('Short body')
    expect(post.state).toBe('pending')
    expect(post.scheduledAt).toBeNull()
    expect(post.storyID).toBeNull()
    expect(post.articleID).toBeNull()
  })

  it('accepts a story or an article as the source', () => {
    expect(newPost('launch', '', 'story-1', null)).toMatchObject({
      storyID: 'story-1',
      articleID: null
    })
    expect(newPost('launch', '', null, 'article-1')).toMatchObject({
      storyID: null,
      articleID: 'article-1'
    })
  })

  it('rejects a story and an article at the same time', () => {
    expect(captureError(() => newPost('launch', '', 'story-1', 'article-1'))).toBe(
      errSourceAmbiguous
    )
  })

  it('only requires a topic', () => {
    const post = newPost('launch note', '', null, null)

    expect(post.id).not.toBe('')
    expect(post.topic).toBe('launch note')
    expect(post.text).toBe('')
  })

  it('rejects a missing or blank topic', () => {
    expect(captureError(() => newPost('', 'text', null, null))).toBe(errTopicRequired)
    expect(captureError(() => newPost('   ', 'text', null, null))).toBe(errTopicRequired)
  })
})

describe('normalisePost', () => {
  it('trims the topic and the text for storage', () => {
    const normalised = normalisePost({ ...emptyPost, topic: '  launch  ', text: '  body  ' })

    expect(normalised.topic).toBe('launch')
    expect(normalised.text).toBe('body')
  })

  it('keeps the scheduled date only while the post is scheduled', () => {
    const date = '2026-11-01T10:00'

    expect(
      normalisePost({ ...emptyPost, state: 'scheduled', scheduledAt: `  ${date}  ` }).scheduledAt
    ).toBe(date)
    expect(
      normalisePost({ ...emptyPost, state: 'pending', scheduledAt: date }).scheduledAt
    ).toBeNull()
    expect(
      normalisePost({ ...emptyPost, state: 'published', scheduledAt: date }).scheduledAt
    ).toBeNull()
    expect(
      normalisePost({ ...emptyPost, state: 'scheduled', scheduledAt: '   ' }).scheduledAt
    ).toBeNull()
  })

  it('trims the source ids and treats an empty string as absence', () => {
    expect(normalisePost({ ...emptyPost, storyID: '  story-1  ' }).storyID).toBe('story-1')
    expect(normalisePost({ ...emptyPost, articleID: '   ' }).articleID).toBeNull()
  })
})

describe('validatePost', () => {
  it('requires a topic', () => {
    expect(() => validatePost({ ...emptyPost, topic: 'launch' })).not.toThrow()
    expect(captureError(() => validatePost(emptyPost))).toBe(errTopicRequired)
    expect(captureError(() => validatePost({ ...emptyPost, topic: '   ' }))).toBe(errTopicRequired)
  })

  it('rejects a scheduled date that is not a valid ISO 8601 date', () => {
    expect(() =>
      validatePost({ ...emptyPost, topic: 'launch', state: 'scheduled', scheduledAt: 'soon' })
    ).toThrow(errScheduledAtInvalid)
    expect(() =>
      validatePost({
        ...emptyPost,
        topic: 'launch',
        state: 'scheduled',
        scheduledAt: '2026-11-01T10:00'
      })
    ).not.toThrow()
  })

  it('rejects a post with a story and an article', () => {
    expect(() =>
      validatePost({ ...emptyPost, topic: 'launch', storyID: 's1', articleID: 'a1' })
    ).toThrow(errSourceAmbiguous)
  })
})
