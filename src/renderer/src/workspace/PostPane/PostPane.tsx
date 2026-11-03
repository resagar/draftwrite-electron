import type { JSX } from 'react'
import type { Post } from '../../data/types'
import { PostEditor } from '../PostEditor/PostEditor'
import { PostHeader } from '../PostHeader/PostHeader'

type PostPaneProps = {
  post: Post | null
}

export function PostPane({ post }: PostPaneProps): JSX.Element {
  return (
    <section
      aria-label={post ? 'Post' : undefined}
      className="flex min-w-0 flex-1 flex-col bg-base-100"
    >
      {post ? <PostHeader post={post} /> : null}

      <PostEditor stored={post} />
    </section>
  )
}
