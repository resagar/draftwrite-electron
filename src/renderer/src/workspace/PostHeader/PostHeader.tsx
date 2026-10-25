import { Trash2 } from 'lucide-react'
import type { JSX } from 'react'
import type { Post } from '../../data/types'
import { useWorkspaceDispatch } from '../../state/workspace-context'
import { IconButton } from '../../ui/IconButton/IconButton'
import { ViewModeSwitcher } from '../ViewModeSwitcher/ViewModeSwitcher'

type PostHeaderProps = {
  post: Post
}

export function PostHeader({ post }: PostHeaderProps): JSX.Element {
  const dispatch = useWorkspaceDispatch()

  return (
    <header className="flex h-9 min-h-9 items-center justify-between gap-3 border-b border-base-300 bg-base-200 px-4">
      <h2 className="min-w-0 truncate text-xs font-semibold">{post.Topic}</h2>

      <div className="flex shrink-0 items-center gap-2.5">
        <ViewModeSwitcher />
        <IconButton
          label="Delete post"
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
      </div>
    </header>
  )
}
