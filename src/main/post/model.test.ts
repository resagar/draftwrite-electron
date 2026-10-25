import { describe, expect, it } from '@jest/globals'
import { errTopicRequired, newPost, normalisePost, validatePost, type Post } from './model'

const emptyPost: Post = {
  id: '',
  topic: '',
  text: '',
  state: 'pending',
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
    const post = newPost('  launch note  ', '  Short body  ')

    expect(post.id).not.toBe('')
    expect(post.topic).toBe('launch note')
    expect(post.text).toBe('Short body')
    expect(post.state).toBe('pending')
  })

  it('only requires a topic', () => {
    const post = newPost('launch note', '')

    expect(post.id).not.toBe('')
    expect(post.topic).toBe('launch note')
    expect(post.text).toBe('')
  })

  it('rejects a missing or blank topic', () => {
    expect(captureError(() => newPost('', 'text'))).toBe(errTopicRequired)
    expect(captureError(() => newPost('   ', 'text'))).toBe(errTopicRequired)
  })
})

describe('normalisePost', () => {
  it('trims the topic and the text for storage', () => {
    const normalised = normalisePost({ ...emptyPost, topic: '  launch  ', text: '  body  ' })

    expect(normalised.topic).toBe('launch')
    expect(normalised.text).toBe('body')
  })
})

describe('validatePost', () => {
  it('requires a topic', () => {
    expect(() => validatePost({ ...emptyPost, topic: 'launch' })).not.toThrow()
    expect(captureError(() => validatePost(emptyPost))).toBe(errTopicRequired)
    expect(captureError(() => validatePost({ ...emptyPost, topic: '   ' }))).toBe(errTopicRequired)
  })
})
