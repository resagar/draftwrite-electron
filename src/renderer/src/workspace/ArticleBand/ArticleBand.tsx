import { cn } from '../../lib/cn'
import type { Story } from '../../data/types'
import { useState, type JSX } from 'react'
import { PropertiesToggle } from '../PropertiesToggle/PropertiesToggle'

type ArticleBandProps = {
  stories: Story[]
  storyId: string
  title: string
  subtitle: string
  creating: boolean
  storyLocked?: boolean
  onStory: (storyId: string) => void
  onTitle: (title: string) => void
  onSubtitle: (subtitle: string) => void
  onDiscard: () => void
}

export function ArticleBand({
  stories,
  storyId,
  title,
  subtitle,
  creating,
  storyLocked = false,
  onStory,
  onTitle,
  onSubtitle,
  onDiscard
}: ArticleBandProps): JSX.Element {
  const field =
    'h-7 rounded border border-line bg-base-200 px-2 text-xs text-base-content focus-visible:border-primary'
  const [propertiesOpen, setPropertiesOpen] = useState(false)
  const missingStoryId = storyId.trim() === ''
  const missingTitle = title.trim() === ''
  // A stored article keeps its provenance: the selector shows where it came from
  // and stops accepting changes.
  const knownStory = stories.some((story) => story.ID === storyId)

  return (
    <div className="workspace-band @container/article-properties flex min-w-0 shrink-0 flex-col gap-2 border-b border-base-300 bg-base-200/60 px-4 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="workspace-heading flex min-w-0 flex-1 items-center gap-2">
          <label htmlFor="article-title" className="sr-only">
            Title
          </label>
          <input
            id="article-title"
            placeholder="Untitled article"
            data-heading-input
            value={title}
            aria-invalid={missingTitle}
            onChange={(event) => onTitle(event.target.value)}
            className={cn(
              field,
              'min-w-0 w-full flex-1',
              missingTitle ? 'border-warning/60' : 'border-line'
            )}
          />
        </div>
        <div className="flex min-w-0 max-w-full basis-40 items-center gap-2">
          <label
            htmlFor="article-story"
            className="shrink-0 text-2xs tracking-wider text-base-content/60"
          >
            Story
          </label>
          <select
            id="article-story"
            value={storyId}
            disabled={!creating || storyLocked}
            aria-invalid={missingStoryId}
            onChange={(event) => onStory(event.target.value)}
            className={cn(
              field,
              'min-w-0 flex-1 disabled:opacity-70',
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
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 @min-[10rem]/article-properties:flex-nowrap">
          <PropertiesToggle
            label="Article properties"
            summary={subtitle.trim() || 'No subtitle'}
            expanded={propertiesOpen}
            controls="article-properties"
            onToggle={() => setPropertiesOpen((open) => !open)}
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
      </div>

      {missingStoryId || missingTitle ? (
        <p role="status" className="text-2xs text-warning">
          A story and a title are required before this article can be saved.
        </p>
      ) : null}

      <div id="article-properties" hidden={!propertiesOpen} className="space-y-1">
        <label htmlFor="article-subtitle" className="text-2xs tracking-wider text-base-content/60">
          Subtitle
        </label>
        <input
          id="article-subtitle"
          value={subtitle}
          onChange={(event) => onSubtitle(event.target.value)}
          className={cn(field, 'w-full')}
        />
      </div>
    </div>
  )
}
