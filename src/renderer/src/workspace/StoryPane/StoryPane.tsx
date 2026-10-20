import { Copy, Lock, SquarePen, Trash2 } from 'lucide-react'
import { useState, type JSX } from 'react'
import { copyText } from '../../data/clipboard'
import type { Story } from '../../data/types'
import { useWorkspaceNavigation } from '../../state/use-navigation'
import { useWorkspaceDispatch } from '../../state/workspace-context'
import { TagChip } from '../../ui/TagChip/TagChip'

type StoryPaneProps = {
  story: Story | null
  storyId: string
}

export function StoryPane({ story, storyId }: StoryPaneProps): JSX.Element {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const dispatch = useWorkspaceDispatch()
  const navigate = useWorkspaceNavigation()

  const copy = async (): Promise<void> => {
    if (story === null) {
      return
    }

    setCopyState((await copyText(story.Text)) ? 'copied' : 'failed')
  }

  return (
    <section
      aria-label="Source story"
      className="flex w-[360px] min-w-[360px] shrink-0 flex-col border-r border-base-300 bg-base-200/50 xl:w-[420px] xl:min-w-[420px]"
    >
      <header className="flex h-9 min-h-9 items-center justify-between gap-2 border-b border-base-300 bg-base-200/80 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Lock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-warning/80" />
          <h2 className="truncate text-xs font-semibold text-base-content/85">Source story</h2>
          <span className="shrink-0 rounded border border-warning/20 bg-warning/15 px-1.5 py-0.5 font-mono text-2xs text-warning">
            Read-only
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {copyState === 'idle' ? null : (
            <span role="status" className="font-mono text-2xs text-base-content/70">
              {copyState === 'copied' ? 'Copied' : 'Could not copy'}
            </span>
          )}
          <button
            type="button"
            aria-label="Open story in editor"
            title="Open story in editor"
            disabled={story === null}
            onClick={() => navigate({ type: 'story/select', storyId })}
            className="rounded p-1 text-base-content/60 transition hover:bg-neutral/40 hover:text-base-content disabled:pointer-events-none disabled:opacity-40"
          >
            <SquarePen aria-hidden="true" className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label="Copy source text"
            title="Copy source text"
            onClick={copy}
            className="rounded p-1 text-base-content/60 transition hover:bg-neutral/40 hover:text-base-content"
          >
            <Copy aria-hidden="true" className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label="Delete story"
            title="Delete story"
            disabled={story === null}
            onClick={() => dispatch({ type: 'dialog/open', dialog: 'delete-story', storyId })}
            className="rounded p-1 text-error transition hover:bg-error/10 hover:text-error disabled:pointer-events-none disabled:opacity-40"
          >
            <Trash2 aria-hidden="true" className="h-3 w-3" />
          </button>
        </div>
      </header>

      <div className="border-b border-base-300/60 bg-surface-raised px-4 py-2">
        <span className="block truncate font-mono text-2xs text-accent" title={storyId}>
          #{storyId}
        </span>
      </div>

      {story === null ? (
        <p className="p-5 text-xs text-base-content/70">
          The story this article came from no longer exists.
        </p>
      ) : (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5 select-text">
          <h3 className="text-xs font-semibold text-secondary">{story.Topic}</h3>

          {story.Titles.length > 0 ? (
            <ul className="space-y-0.5 text-xs text-base-content/80">
              {story.Titles.map((title) => (
                <li key={title}>{title}</li>
              ))}
            </ul>
          ) : null}

          {story.Tags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              {story.Tags.map((tag) => (
                <TagChip key={tag} tag={tag} />
              ))}
            </div>
          ) : null}

          <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-base-content/70">
            {story.Text}
          </pre>
        </div>
      )}
    </section>
  )
}
