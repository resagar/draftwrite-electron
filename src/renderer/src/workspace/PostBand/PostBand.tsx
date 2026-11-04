import { useState, type JSX } from 'react'
import { POST_STATE_LABELS } from '../../data/post-state'
import type { Article, PostState, Story } from '../../data/types'
import { cn } from '../../lib/cn'
import { PropertiesToggle } from '../PropertiesToggle/PropertiesToggle'

type PostBandProps = {
  topic: string
  state: PostState
  scheduledAt: string | null
  storyId: string | null
  articleId: string | null
  sourceName: string
  stories: Story[]
  articles: Article[]
  creating: boolean
  onTopic: (topic: string) => void
  onState: (state: PostState) => void
  onScheduledAt: (scheduledAt: string | null) => void
  onSource: (storyId: string | null, articleId: string | null) => void
  onDiscard: () => void
}

const field =
  'h-7 rounded border bg-base-200 px-2 text-xs text-base-content focus-visible:border-primary'
const label = 'shrink-0 text-2xs tracking-wider text-base-content/60'

export function PostBand({
  topic,
  state,
  scheduledAt,
  storyId,
  articleId,
  sourceName,
  stories,
  articles,
  creating,
  onTopic,
  onState,
  onScheduledAt,
  onSource,
  onDiscard
}: PostBandProps): JSX.Element {
  const [propertiesOpen, setPropertiesOpen] = useState(false)
  const missingTopic = topic.trim() === ''
  const sourceLocked = state !== 'pending'
  const sourceValue =
    storyId !== null ? `story:${storyId}` : articleId !== null ? `article:${articleId}` : ''

  const knownSource =
    storyId !== null
      ? stories.some((story) => story.ID === storyId)
      : articleId !== null && articles.some((article) => article.ID === articleId)
  const summary = `Source: ${sourceName}${sourceLocked ? ' (locked)' : ''}`

  const changeSource = (value: string): void => {
    if (value.startsWith('story:')) {
      onSource(value.slice('story:'.length), null)
    } else if (value.startsWith('article:')) {
      onSource(null, value.slice('article:'.length))
    } else {
      onSource(null, null)
    }
  }

  return (
    <div className="workspace-band flex min-w-0 shrink-0 flex-col gap-2 border-b border-base-300 bg-base-200/60 px-4 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="workspace-heading flex min-w-0 flex-1 items-center gap-2">
          <label htmlFor="post-topic" className="sr-only">
            Topic
          </label>
          <input
            id="post-topic"
            placeholder="Post topic"
            data-heading-input
            value={topic}
            aria-invalid={missingTopic}
            onChange={(event) => onTopic(event.target.value)}
            className={cn(
              field,
              'min-w-0 flex-1',
              missingTopic ? 'border-warning/60' : 'border-line'
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="post-state" className={label}>
            State
          </label>
          <select
            id="post-state"
            value={state}
            onChange={(event) => onState(event.target.value as PostState)}
            className={cn(field, 'shrink-0')}
          >
            <option value="pending">{POST_STATE_LABELS.pending}</option>
            <option value="scheduled">{POST_STATE_LABELS.scheduled}</option>
            <option value="published">{POST_STATE_LABELS.published}</option>
          </select>
        </div>
        <PropertiesToggle
          label="Post properties"
          summary={summary}
          expanded={propertiesOpen}
          controls="post-properties"
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

      <div id="post-properties" hidden={!propertiesOpen}>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="post-source" className={label}>
            Source
          </label>
          <select
            id="post-source"
            value={sourceValue}
            disabled={sourceLocked}
            onChange={(event) => changeSource(event.target.value)}
            className={cn(field, 'min-w-0 max-w-full flex-1 basis-48 disabled:opacity-70')}
          >
            <option value="">No source</option>
            {sourceValue !== '' && !knownSource ? (
              <option value={sourceValue}>{sourceName}</option>
            ) : null}
            <optgroup label="Stories">
              {stories.map((story) => (
                <option key={story.ID} value={`story:${story.ID}`}>
                  {story.Topic}
                </option>
              ))}
            </optgroup>
            <optgroup label="Articles">
              {articles.map((article) => (
                <option key={article.ID} value={`article:${article.ID}`}>
                  {article.Title}
                </option>
              ))}
            </optgroup>
          </select>
          {sourceLocked ? (
            <span className="text-2xs text-base-content/60">Locked while the post is {state}.</span>
          ) : null}
        </div>
      </div>
      {state === 'scheduled' ? (
        <div className="flex flex-wrap items-center gap-2">
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
            className={cn(field, 'min-w-0 max-w-full')}
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
