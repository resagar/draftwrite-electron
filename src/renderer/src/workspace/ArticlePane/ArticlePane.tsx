import type { JSX } from 'react'
import type { Article } from '../../data/types'
import { ArticleEditor } from '../ArticleEditor/ArticleEditor'

type ArticlePaneProps = {
  article: Article | null
  initialStoryId?: string
  onStoryChange?: (storyId: string) => void
}

export function ArticlePane({
  article,
  initialStoryId,
  onStoryChange
}: ArticlePaneProps): JSX.Element {
  return (
    <section
      aria-label={article ? 'Article' : undefined}
      className="content-layer flex min-w-0 flex-1 flex-col bg-base-100"
    >
      <ArticleEditor
        stored={article}
        initialStoryId={initialStoryId}
        onStoryChange={onStoryChange}
      />
    </section>
  )
}
