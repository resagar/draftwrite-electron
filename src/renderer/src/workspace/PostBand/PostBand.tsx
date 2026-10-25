import type { JSX } from 'react'
import { cn } from '../../lib/cn'

type PostBandProps = {
  topic: string
  creating: boolean
  onTopic: (topic: string) => void
  onDiscard: () => void
}

export function PostBand({ topic, creating, onTopic, onDiscard }: PostBandProps): JSX.Element {
  const missingTopic = topic.trim() === ''

  return (
    <div className="space-y-2 border-b border-base-300 bg-base-200/60 px-4 py-2">
      <div className="flex items-center gap-2">
        <label
          htmlFor="post-topic"
          className="shrink-0 text-2xs tracking-wider text-base-content/60"
        >
          Topic
        </label>
        <input
          id="post-topic"
          value={topic}
          aria-invalid={missingTopic}
          onChange={(event) => onTopic(event.target.value)}
          className={cn(
            'h-7 min-w-0 flex-1 rounded border bg-base-200 px-2 text-xs text-base-content focus-visible:border-primary',
            missingTopic ? 'border-warning/60' : 'border-line'
          )}
        />
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

      {missingTopic ? (
        <p role="status" className="text-2xs text-warning">
          A topic is required before this post can be saved.
        </p>
      ) : null}
    </div>
  )
}
