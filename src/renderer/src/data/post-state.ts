import type { PostState } from './types'

export const POST_STATE_LABELS: Record<PostState, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  published: 'Published'
}

export const POST_STATE_BADGES: Record<PostState, string> = {
  pending: 'border-warning/20 bg-warning/15 text-warning',
  scheduled: 'border-info/20 bg-info/15 text-info',
  published: 'border-success/20 bg-success/15 text-success'
}
