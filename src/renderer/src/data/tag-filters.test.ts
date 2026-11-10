import { expect, it } from '@jest/globals'
import { makeArticle, makePost, makeStory } from './fake/factories'
import { collectTags, filterArticlesByTag, filterPostsByTag } from './library'

it('collects tags used exclusively by an Article or a Post', () => {
  expect(
    collectTags([
      makeStory({ Tags: ['source'] }),
      makeArticle({ Tags: ['own-article'] }),
      makePost({ Tags: ['own-post', 'source'] })
    ])
  ).toEqual(['own-article', 'own-post', 'source'])
})

it('matches Articles by own or parent tags without assigning parent tags', () => {
  const story = makeStory({ Tags: ['source'] })
  const article = makeArticle({ Tags: ['own'] })
  expect(filterArticlesByTag([article], [story], 'own')).toEqual([article])
  expect(filterArticlesByTag([article], [story], 'source')).toEqual([article])
  expect(filterArticlesByTag([article], [story], 'Source')).toEqual([])
  expect(article.Tags).toEqual(['own'])
})

it('matches Posts only by own tags even when a source is present or disappears', () => {
  const post = makePost({ StoryID: 'story-1', Tags: ['own'] })
  expect(filterPostsByTag([post], 'source')).toEqual([])
  expect(filterPostsByTag([post], 'own')).toEqual([post])
  expect(filterPostsByTag([{ ...post, StoryID: null }], 'own')).toHaveLength(1)
})
