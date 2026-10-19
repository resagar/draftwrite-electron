import { Inbox } from 'lucide-react'
import type { JSX } from 'react'
import { cn } from '../../lib/cn'
import { useLibrary } from '../../state/library-context'
import { useWorkspaceNavigation } from '../../state/use-navigation'
import { useWorkspace } from '../../state/workspace-context'
import { ErrorState } from '../../ui/ErrorState/ErrorState'
import { SkeletonList } from '../../ui/Skeleton/Skeleton'
import { ListColumn } from '../ListColumn/ListColumn'
import { ListEmpty } from '../ListEmpty/ListEmpty'
import { ListRowItem } from '../ListRowItem/ListRowItem'
import { SortToggle } from '../SortToggle/SortToggle'
import { useOptionList } from '../use-option-list'

export function StoryList(): JSX.Element {
  const { stories, storiesTotal, storiesStatus, reloadStories } = useLibrary()
  const { selectedStoryId, tagFilter } = useWorkspace()
  const navigate = useWorkspaceNavigation()

  const list = useOptionList({
    count: stories.length,
    onActivate: (index) => navigate({ type: 'story/select', storyId: stories[index].ID })
  })

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
              New Story
            </button>
          }
        />
      </ListColumn>
    )
  }

  return (
    <ListColumn title="Stories" count={stories.length} headerActions={<SortToggle />}>
      <ul
        role="listbox"
        aria-label="Stories"
        className="divide-y divide-base-300/80"
        onKeyDown={list.onKeyDown}
      >
        {stories.map((story, index) => {
          const selected = story.ID === selectedStoryId

          return (
            <li
              key={story.ID}
              role="option"
              aria-selected={selected}
              tabIndex={list.tabIndexFor(index)}
              ref={(element) => {
                list.itemsRef.current[index] = element
              }}
              onFocus={() => list.onItemFocus(index)}
              onClick={() => navigate({ type: 'story/select', storyId: story.ID })}
              className={cn(
                'cursor-pointer border-l-2 px-3 py-2.5 transition',
                selected ? 'border-primary bg-neutral' : 'border-transparent hover:bg-neutral/40'
              )}
            >
              <ListRowItem
                title={story.Topic}
                updatedAt={story.UpdatedAt}
                text={story.Text}
                tags={story.Tags}
                selected={selected}
              />
            </li>
          )
        })}
      </ul>
    </ListColumn>
  )
}
