import type { JSX } from 'react'
import type { Post } from '../../data/types'
import { PostEditor } from '../PostEditor/PostEditor'
import { PostHeader } from '../PostHeader/PostHeader'

type PostPaneProps = {
  post: Post
}

export function PostPane({ post }: PostPaneProps): JSX.Element {
  return (
    <section aria-label="Post" className="flex min-w-0 flex-1 flex-col bg-base-100">
      <PostHeader post={post} />

      <PostEditor key={post.ID} stored={post} />
    </section>
  )
}
