import { Inbox, Trash2 } from 'lucide-react'
import type { JSX } from 'react'
import { CREATE_LABELS } from '../../lib/create-labels'
import { useLibrary } from '../../state/library-context'
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

export function StoryList(): JSX.Element {
  const { stories, storiesTotal, storiesStatus, reloadStories } = useLibrary()
  const { selectedStoryId, tagFilter } = useWorkspace()
  const dispatch = useWorkspaceDispatch()
  const navigate = useWorkspaceNavigation()

  const filtered = tagFilter !== null && storiesTotal > 0

  if (storiesStatus === 'loading') {
    return (
      <ListColumn title="Stories">
        <SkeletonList label="Loading stories" />
      </ListColumn>
    )
  }

  if (storiesStatus === 'error') {
    return (
      <ListColumn title="Stories">
        <ErrorState
          title="Stories could not be loaded"
          description="The app could not read your stories from the local database."
          onRetry={reloadStories}
        />
      </ListColumn>
    )
  }

  if (stories.length === 0) {
    return (
      <ListColumn title="Stories" count={0}>
        <ListEmpty
          filtered={filtered}
          icon={<Inbox className="h-7 w-7" />}
          title={filtered ? 'No stories with this tag' : 'No stories yet'}
          description={
            filtered
              ? 'Clear the filter to see all of your stories.'
              : 'Stories you write will show up here.'
          }
          onClearFilter={() => navigate({ type: 'filter/tag', tag: null })}
          action={
            <button
              type="button"
              onClick={() => navigate({ type: 'create/start', kind: 'story' })}
              className="mt-1 rounded border border-line-strong bg-neutral px-2 py-1 text-xs font-medium text-base-content transition hover:bg-neutral/80"
            >
              {CREATE_LABELS.story}
            </button>
          }
        />
      </ListColumn>
    )
  }

  return (
    <ListColumn title="Stories" count={stories.length} headerActions={<SortToggle />}>
      <OptionList
        label="Stories"
        items={stories}
        getId={(story) => story.ID}
        selectedId={selectedStoryId}
        onSelect={(story) => navigate({ type: 'story/select', storyId: story.ID })}
        renderContent={(story, selected) => (
          <ListRowItem
            title={story.Topic}
            updatedAt={story.UpdatedAt}
            text={story.Text}
            tags={story.Tags}
            selected={selected}
          />
        )}
        renderAction={(story) => (
          <IconButton
            label={`Delete story “${story.Topic}”`}
            tone="danger"
            onClick={() =>
              dispatch({ type: 'dialog/open', dialog: 'delete-story', storyId: story.ID })
            }
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          </IconButton>
        )}
      />
    </ListColumn>
  )
}
