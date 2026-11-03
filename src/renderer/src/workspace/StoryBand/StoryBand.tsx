import { Trash2 } from 'lucide-react'
import { useState, type JSX } from 'react'
import { cn } from '../../lib/cn'
import { TagInput } from '../../forms/TagInput/TagInput'
import { IconButton } from '../../ui/IconButton/IconButton'
import { PropertiesToggle } from '../PropertiesToggle/PropertiesToggle'

type TitlesFieldProps = {
  titles: string[]
  onChange: (titles: string[]) => void
}

function TitlesField({ titles, onChange }: TitlesFieldProps): JSX.Element {
  return (
    <div className="min-w-0 flex-1 basis-48 space-y-1">
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
  onDelete: () => void
}

export function StoryBand({
  topic,
  titles,
  tags,
  creating,
  onTopic,
  onTitles,
  onTags,
  onDiscard,
  onDelete
}: StoryBandProps): JSX.Element {
  const missingTopic = topic.trim() === ''
  const [propertiesOpen, setPropertiesOpen] = useState(false)
  const titleCount = titles.filter((title) => title.trim() !== '').length
  const summary = `${titleCount} ${titleCount === 1 ? 'title' : 'titles'} · ${tags.length} ${tags.length === 1 ? 'tag' : 'tags'}`

  return (
    <div className="workspace-band flex min-w-0 shrink-0 flex-col gap-2 border-b border-base-300 bg-base-200/60 px-4 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 basis-full items-center gap-2">
          <label htmlFor="story-topic" className="sr-only">
            Topic
          </label>
          <input
            id="story-topic"
            placeholder="Story topic"
            data-heading-input
            value={topic}
            aria-invalid={missingTopic}
            onChange={(event) => onTopic(event.target.value)}
            className={cn(
              'h-7 min-w-0 flex-1 rounded border bg-base-200 px-2 text-xs text-base-content focus-visible:border-primary',
              missingTopic ? 'border-warning/60' : 'border-line'
            )}
          />
        </div>
        <PropertiesToggle
          label="Story properties"
          summary={summary}
          expanded={propertiesOpen}
          controls="story-properties"
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
        ) : (
          <IconButton label="Delete story" tone="danger" onClick={onDelete}>
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          </IconButton>
        )}
      </div>

      {missingTopic ? (
        <p role="status" className="text-2xs text-warning">
          A topic is required before this story can be saved.
        </p>
      ) : null}

      <div id="story-properties" hidden={!propertiesOpen} className="max-h-48 overflow-y-auto">
        <div className="flex flex-wrap items-start gap-4">
          <TitlesField titles={titles} onChange={onTitles} />
          <div className="min-w-0 flex-1 basis-44 space-y-1">
            <span className="text-2xs tracking-wider text-base-content/60">Tags</span>
            <TagInput tags={tags} onChange={onTags} />
          </div>
        </div>
      </div>
    </div>
  )
}
