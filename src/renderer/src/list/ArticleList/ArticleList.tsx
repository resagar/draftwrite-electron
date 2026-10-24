import { FileText, Plus, Trash2 } from 'lucide-react'
import type { JSX } from 'react'
import { cn } from '../../lib/cn'
import { DISABLED_CREATE_BUTTON } from '../../lib/classes'
import { CREATE_LABELS } from '../../lib/create-labels'
import { useLibrary } from '../../state/library-context'
import { useStoryInContext } from '../../state/use-story-in-context'
import { useWorkspaceNavigation } from '../../state/use-navigation'
import { useWorkspace, useWorkspaceDispatch } from '../../state/workspace-context'
import { ErrorState } from '../../ui/ErrorState/ErrorState'
import { IconButton } from '../../ui/IconButton/IconButton'
import { SkeletonList } from '../../ui/Skeleton/Skeleton'
import { ListColumn } from '../ListColumn/ListColumn'
import { ListEmpty } from '../ListEmpty/ListEmpty'
import { ListRowItem } from '../ListRowItem/ListRowItem'
import { OptionList } from '../OptionList/OptionList'
import { SortToggle } from '../SortToggle/SortToggle'

export function ArticleList(): JSX.Element {
  const { articles, articlesStatus, reloadArticles, storyById } = useLibrary()
  const { selectedArticleId, tagFilter, zenMode } = useWorkspace()
  const dispatch = useWorkspaceDispatch()
  const navigate = useWorkspaceNavigation()

  const { story: openStory, hasStories: canCreate } = useStoryInContext()

  const filtered = tagFilter !== null

  const startNew = (): void =>
    navigate({ type: 'create/start', kind: 'article', storyId: openStory?.ID })

  const newArticle = (
    <button
      type="button"
      disabled={!canCreate}
      onClick={startNew}
      className={cn(
        'mt-1 rounded border border-line-strong bg-neutral px-2 py-1 text-xs font-medium text-base-content transition hover:bg-neutral/80',
        DISABLED_CREATE_BUTTON
      )}
    >
      {CREATE_LABELS.article}
    </button>
  )

  if (articlesStatus === 'loading') {
    return (
      <ListColumn title="Articles" collapsed={zenMode}>
        <SkeletonList label="Loading articles" />
      </ListColumn>
    )
  }

  if (articlesStatus === 'error') {
    return (
      <ListColumn title="Articles" collapsed={zenMode}>
        <ErrorState
          title="Articles could not be loaded"
          description="The app could not read your articles from the local database."
          onRetry={reloadArticles}
        />
      </ListColumn>
    )
  }

  if (articles.length === 0) {
    return (
      <ListColumn title="Articles" count={0} collapsed={zenMode}>
        <ListEmpty
          filtered={filtered}
          icon={<FileText className="h-7 w-7" />}
          title={filtered ? 'No articles with this tag' : 'No articles yet'}
          description={
            filtered
              ? 'Clear the filter to see all of your articles.'
              : !canCreate
                ? 'A story is required before you can write an article.'
                : openStory === null
                  ? 'Write your first article and pick its story in the band.'
                  : `Write the first article from “${openStory.Topic}”.`
          }
          onClearFilter={() => dispatch({ type: 'filter/tag', tag: null })}
          action={newArticle}
        />
      </ListColumn>
    )
  }

  return (
    <ListColumn
      title="Articles"
      count={articles.length}
      collapsed={zenMode}
      headerActions={
        <div className="flex items-center gap-1.5">
          <SortToggle />
          {canCreate ? null : <span className="text-2xs text-base-content/60">No story yet</span>}
          <IconButton label={CREATE_LABELS.article} disabled={!canCreate} onClick={startNew}>
            <Plus aria-hidden="true" className="h-3 w-3" />
          </IconButton>
        </div>
      }
    >
      <OptionList
        label="Articles"
        items={articles}
        getId={(article) => article.ID}
        selectedId={selectedArticleId}
        onSelect={(article) => navigate({ type: 'article/select', articleId: article.ID })}
        renderContent={(article, selected) => (
          <ListRowItem
            title={article.Title}
            updatedAt={article.UpdatedAt}
            text={article.Text}
            selected={selected}
          />
        )}
        renderAction={(article) => {
          const story = storyById(article.StoryID)
          const label =
            story === null
              ? `Delete article “${article.Title}”`
              : `Delete article “${article.Title}” from “${story.Topic}”`

          return (
            <IconButton
              label={label}
              tone="danger"
              onClick={() =>
                dispatch({
                  type: 'dialog/open',
                  request: { kind: 'delete-article', articleId: article.ID }
                })
              }
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
            </IconButton>
          )
        }}
      />
    </ListColumn>
  )
}
