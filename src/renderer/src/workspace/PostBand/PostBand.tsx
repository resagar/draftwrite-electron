import type { JSX } from 'react'
import type { PostState } from '../../data/types'
import { cn } from '../../lib/cn'

type PostBandProps = {
  topic: string
  state: PostState
  scheduledAt: string | null
  creating: boolean
  onTopic: (topic: string) => void
  onState: (state: PostState) => void
  onScheduledAt: (scheduledAt: string | null) => void
  onDiscard: () => void
}

const field =
  'h-7 rounded border bg-base-200 px-2 text-xs text-base-content focus-visible:border-primary'
const label = 'shrink-0 text-2xs tracking-wider text-base-content/60'

export function PostBand({
  topic,
  state,
  scheduledAt,
  creating,
  onTopic,
  onState,
  onScheduledAt,
  onDiscard
}: PostBandProps): JSX.Element {
  const missingTopic = topic.trim() === ''

  return (
    <div className="space-y-2 border-b border-base-300 bg-base-200/60 px-4 py-2">
      <div className="flex items-center gap-2">
        <label htmlFor="post-topic" className={label}>
          Topic
        </label>
        <input
          id="post-topic"
          value={topic}
          aria-invalid={missingTopic}
          onChange={(event) => onTopic(event.target.value)}
          className={cn(
            field,
            'min-w-0 flex-1',
            missingTopic ? 'border-warning/60' : 'border-line'
          )}
        />

        <label htmlFor="post-state" className={label}>
          State
        </label>
        <select
          id="post-state"
          value={state}
          onChange={(event) => onState(event.target.value as PostState)}
          className={cn(field, 'shrink-0')}
        >
          <option value="pending">Pending</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </select>

        {creating ? (
          <button
            type="button"
            onClick={onDiscard}
            className="shrink-0 rounded border border-line px-2 py-1 text-xs text-base-content/80 transition hover:bg-neutral/40"
          >
            Discard
          </button>
        ) : null}
      </div>

      {state === 'scheduled' ? (
        <div className="flex items-center gap-2">
          <label htmlFor="post-scheduled-at" className={label}>
            Scheduled at
          </label>
          <input
            id="post-scheduled-at"
            type="datetime-local"
            value={scheduledAt ?? ''}
            onChange={(event) =>
              onScheduledAt(event.target.value === '' ? null : event.target.value)
            }
            className={cn(field, 'shrink-0')}
          />
          <span className="text-2xs text-base-content/60">Optional</span>
        </div>
      ) : null}

      {missingTopic ? (
        <p role="status" className="text-2xs text-warning">
          A topic is required before this post can be saved.
        </p>
      ) : null}
    </div>
  )
}
