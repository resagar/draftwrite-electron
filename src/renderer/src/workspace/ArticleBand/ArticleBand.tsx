import { cn } from '../../lib/cn'
import type { Story } from '../../data/types'
import type { JSX } from 'react'

type ArticleBandProps = {
  stories: Story[]
  storyId: string
  title: string
  subtitle: string
  target: string
  creating: boolean
  onStory: (storyId: string) => void
  onTitle: (title: string) => void
  onSubtitle: (subtitle: string) => void
  onTarget: (target: string) => void
  onDiscard: () => void
}

export function ArticleBand({
  stories,
  storyId,
  title,
  subtitle,
  target,
  creating,
  onStory,
  onTitle,
  onSubtitle,
  onTarget,
  onDiscard
}: ArticleBandProps): JSX.Element {
  const field =
    'h-7 rounded border border-line bg-base-200 px-2 text-xs text-base-content focus-visible:border-primary'
  const missingStoryId = storyId.trim() === ''
  const missingTitle = title.trim() === ''
  // A stored article keeps its provenance: the selector shows where it came from
  // and stops accepting changes.
  const knownStory = stories.some((story) => story.ID === storyId)

  return (
    <div className="space-y-2 border-b border-base-300 bg-base-200/60 px-4 py-2">
      <div className="flex items-center gap-2">
        <label
          htmlFor="article-story"
          className="shrink-0 text-2xs tracking-wider text-base-content/60"
        >
          Story
        </label>
        <select
          id="article-story"
          value={storyId}
          disabled={!creating}
          aria-invalid={missingStoryId}
          onChange={(event) => onStory(event.target.value)}
          className={cn(
            'h-7 min-w-0 max-w-[240px] rounded border bg-base-200 px-2 text-xs text-base-content focus-visible:border-primary disabled:opacity-70',
            missingStoryId ? 'border-warning/60' : 'border-line'
          )}
        >
          <option value="">Choose a story…</option>
          {knownStory || storyId === '' ? null : <option value={storyId}>{storyId}</option>}
          {stories.map((story) => (
            <option key={story.ID} value={story.ID}>
              {story.Topic}
            </option>
          ))}
        </select>

        <label
          htmlFor="article-title"
          className="shrink-0 text-2xs tracking-wider text-base-content/60"
        >
          Title
        </label>
        <input
          id="article-title"
          value={title}
          aria-invalid={missingTitle}
          onChange={(event) => onTitle(event.target.value)}
          className={cn(
            field,
            'min-w-0 flex-1',
            missingTitle ? 'border-warning/60' : 'border-line'
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

      {missingStoryId || missingTitle ? (
        <p role="status" className="text-2xs text-warning">
          A story and a title are required before this article can be saved.
        </p>
      ) : null}

      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-[180px] flex-1 space-y-1">
          <label
            htmlFor="article-subtitle"
            className="text-2xs tracking-wider text-base-content/60"
          >
            Subtitle
          </label>
          <input
            id="article-subtitle"
            value={subtitle}
            onChange={(event) => onSubtitle(event.target.value)}
            className={cn(field, 'w-full')}
          />
        </div>
        <div className="min-w-[180px] flex-1 space-y-1">
          <label htmlFor="article-target" className="text-2xs tracking-wider text-base-content/60">
            Target
          </label>
          <input
            id="article-target"
            value={target}
            onChange={(event) => onTarget(event.target.value)}
            className={cn(field, 'w-full')}
          />
        </div>
      </div>
    </div>
  )
}
