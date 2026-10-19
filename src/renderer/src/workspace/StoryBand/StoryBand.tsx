import type { JSX } from 'react'
import { cn } from '../../lib/cn'
import { TagInput } from '../../forms/TagInput/TagInput'

type TitlesFieldProps = {
  titles: string[]
  onChange: (titles: string[]) => void
}

function TitlesField({ titles, onChange }: TitlesFieldProps): JSX.Element {
  return (
    <div className="min-w-[200px] flex-1 space-y-1">
      <span className="text-2xs tracking-wider text-base-content/60">Titles</span>
      {titles.map((title, index) => (
        <div key={index} className="flex items-center gap-1">
          <input
            aria-label={`Title ${index + 1}`}
            value={title}
            onChange={(event) =>
              onChange(
                titles.map((current, position) =>
                  position === index ? event.target.value : current
                )
              )
            }
            className="h-6 w-full rounded border border-line bg-base-200 px-2 text-xs text-base-content focus-visible:border-primary"
          />
          <button
            type="button"
            aria-label={`Remove title ${index + 1}`}
            onClick={() => onChange(titles.filter((_, position) => position !== index))}
            className="shrink-0 rounded px-1.5 text-xs text-base-content/60 transition hover:text-error"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...titles, ''])}
        className="rounded px-1.5 py-0.5 text-2xs text-secondary transition hover:bg-neutral/40"
      >
        Add title
      </button>
    </div>
  )
}

type StoryBandProps = {
  topic: string
  titles: string[]
  tags: string[]
  creating: boolean
  onTopic: (topic: string) => void
  onTitles: (titles: string[]) => void
  onTags: (tags: string[]) => void
  onDiscard: () => void
}

export function StoryBand({
  topic,
  titles,
  tags,
  creating,
  onTopic,
  onTitles,
  onTags,
  onDiscard
}: StoryBandProps): JSX.Element {
  const missingTopic = topic.trim() === ''

  return (
    <div className="space-y-2 border-b border-base-300 bg-base-200/60 px-4 py-2">
      <div className="flex items-center gap-2">
        <label
          htmlFor="story-topic"
          className="shrink-0 text-2xs tracking-wider text-base-content/60"
        >
          Topic
        </label>
        <input
          id="story-topic"
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
          A topic is required before this story can be saved.
        </p>
      ) : null}

      <div className="flex flex-wrap items-start gap-4">
        <TitlesField titles={titles} onChange={onTitles} />
        <div className="min-w-[180px] flex-1 space-y-1">
          <span className="text-2xs tracking-wider text-base-content/60">Tags</span>
          <TagInput tags={tags} onChange={onTags} />
        </div>
      </div>
    </div>
  )
}
