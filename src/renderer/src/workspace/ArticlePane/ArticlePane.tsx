import type { JSX } from 'react'
import type { Article, Story } from '../../data/types'
import { ArticleEditor } from '../ArticleEditor/ArticleEditor'
import { ArticleHeader } from '../ArticleHeader/ArticleHeader'

type ArticlePaneProps = {
  article: Article
  story: Story | null
}

export function ArticlePane({ article, story }: ArticlePaneProps): JSX.Element {
  return (
    <section aria-label="Article" className="flex min-w-0 flex-1 flex-col bg-base-100">
      <ArticleHeader article={article} story={story} />

      <ArticleEditor key={article.ID} stored={article} />
    </section>
  )
}
