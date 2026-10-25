import { Send, Trash2 } from 'lucide-react'
import type { JSX } from 'react'
import { formatRelativeDate } from '../../data/format'
import type { PostState } from '../../data/types'
import { cn } from '../../lib/cn'
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

const STATE_LABELS: Record<PostState, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  published: 'Published'
}

const STATE_BADGES: Record<PostState, string> = {
  pending: 'border-warning/20 bg-warning/15 text-warning',
  scheduled: 'border-info/20 bg-info/15 text-info',
  published: 'border-success/20 bg-success/15 text-success'
}

export function PostList(): JSX.Element {
  const { posts, postsStatus, reloadPosts } = useLibrary()
  const { selectedPostId, zenMode } = useWorkspace()
  const dispatch = useWorkspaceDispatch()
  const navigate = useWorkspaceNavigation()

  if (postsStatus === 'loading') {
    return (
      <ListColumn title="Posts" collapsed={zenMode}>
        <SkeletonList label="Loading posts" />
      </ListColumn>
    )
  }

  if (postsStatus === 'error') {
    return (
      <ListColumn title="Posts" collapsed={zenMode}>
        <ErrorState
          title="Posts could not be loaded"
          description="The app could not read your posts from the local database."
          onRetry={reloadPosts}
        />
      </ListColumn>
    )
  }

  if (posts.length === 0) {
    return (
      <ListColumn title="Posts" count={0} collapsed={zenMode}>
        <ListEmpty
          filtered={false}
          icon={<Send className="h-7 w-7" />}
          title="No posts yet"
          description="Short posts you write will show up here."
          onClearFilter={() => undefined}
          action={
            <button
              type="button"
              onClick={() => navigate({ type: 'create/start', kind: 'post' })}
              className="mt-1 rounded border border-line-strong bg-neutral px-2 py-1 text-xs font-medium text-base-content transition hover:bg-neutral/80"
            >
              {CREATE_LABELS.post}
            </button>
          }
        />
      </ListColumn>
    )
  }

  return (
    <ListColumn
      title="Posts"
      count={posts.length}
      collapsed={zenMode}
      headerActions={<SortToggle />}
    >
      <OptionList
        label="Posts"
        items={posts}
        getId={(post) => post.ID}
        selectedId={selectedPostId}
        onSelect={(post) => navigate({ type: 'post/select', postId: post.ID })}
        renderContent={(post, selected) => (
          <>
            <ListRowItem
              title={post.Topic}
              updatedAt={post.UpdatedAt}
              text={post.Text}
              selected={selected}
            />
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  'rounded border px-1.5 py-0.5 font-mono text-2xs',
                  STATE_BADGES[post.State]
                )}
              >
                {STATE_LABELS[post.State]}
              </span>
              {post.State === 'scheduled' && post.ScheduledAt !== null ? (
                <span className="font-mono text-2xs text-base-content/60">
                  {formatRelativeDate(post.ScheduledAt)}
                </span>
              ) : null}
            </div>
          </>
        )}
        renderAction={(post) => (
          <IconButton
            label={`Delete post “${post.Topic}”`}
            tone="danger"
            onClick={() =>
              dispatch({
                type: 'dialog/open',
                request: { kind: 'delete-post', postId: post.ID }
              })
            }
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          </IconButton>
        )}
      />
    </ListColumn>
  )
}
