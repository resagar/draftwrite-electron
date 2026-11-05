import type { JSX } from 'react'
import type { Article, Story } from '../../data/types'
import { ArticleEditor } from '../ArticleEditor/ArticleEditor'
import { ArticleHeader } from '../ArticleHeader/ArticleHeader'

type ArticlePaneProps = {
  article: Article | null
  story: Story | null
  initialStoryId?: string
  onStoryChange?: (storyId: string) => void
}

export function ArticlePane({
  article,
  story,
  initialStoryId,
  onStoryChange
}: ArticlePaneProps): JSX.Element {
  return (
    <section
      aria-label={article ? 'Article' : undefined}
      className="flex min-w-0 flex-1 flex-col bg-base-100"
    >
      <ArticleEditor
        stored={article}
        renderHeader={(versionsAction) =>
          article ? (
            <ArticleHeader article={article} story={story} versionsAction={versionsAction} />
          ) : null
        }
        initialStoryId={initialStoryId}
        onStoryChange={onStoryChange}
      />
    </section>
  )
}
