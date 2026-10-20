import { Trash2 } from 'lucide-react'
import type { JSX } from 'react'
import type { Article, Story } from '../../data/types'
import { useWorkspaceDispatch } from '../../state/workspace-context'
import { IconButton } from '../../ui/IconButton/IconButton'
import { ViewModeSwitcher } from '../ViewModeSwitcher/ViewModeSwitcher'

type ArticleHeaderProps = {
  article: Article
  story: Story | null
}

export function ArticleHeader({ article, story }: ArticleHeaderProps): JSX.Element {
  const dispatch = useWorkspaceDispatch()

  return (
    <header className="flex h-9 min-h-9 items-center justify-between gap-3 border-b border-base-300 bg-base-200 px-4">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate text-xs font-semibold">{article.Title}</h2>
        <span className="flex min-w-0 items-center gap-1 text-xs text-base-content/60">
          <span aria-hidden="true">↳</span>
          <span className="shrink-0">derived from</span>
          <span className="truncate font-mono text-base-content/70">
            {story === null ? 'an unknown story' : story.Topic}
          </span>
          <span className="shrink-0 font-mono text-base-content/50" title={article.StoryID}>
            #{article.StoryID}
          </span>
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <ViewModeSwitcher />
        <IconButton
          label="Delete article"
          tone="danger"
          onClick={() =>
            dispatch({ type: 'dialog/open', dialog: 'delete-article', articleId: article.ID })
          }
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </header>
  )
}
