import { Copy, Lock, PanelLeftClose, PanelLeftOpen, SquarePen, Trash2 } from 'lucide-react'
import { useId, useState, type JSX } from 'react'
import { copyText } from '../../data/clipboard'
import type { Story } from '../../data/types'
import { cn } from '../../lib/cn'
import { useWorkspaceNavigation } from '../../state/use-navigation'
import { useWorkspaceDispatch } from '../../state/workspace-context'
import { ErrorState } from '../../ui/ErrorState/ErrorState'
import { IconButton } from '../../ui/IconButton/IconButton'
import { TagChip } from '../../ui/TagChip/TagChip'

export type SourceStoryState =
  | { kind: 'ready'; storyId: string; story: Story }
  | { kind: 'empty' }
  | { kind: 'loading'; storyId: string }
  | { kind: 'error'; storyId: string }
  | { kind: 'missing'; storyId: string }

type StoryPaneProps = {
  source: SourceStoryState
  creating: boolean
  expanded: boolean
  onToggle: () => void
  onRetry: () => void
}

function CopySourceAction({ text }: { text: string | null }): JSX.Element {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const copy = async (): Promise<void> => {
    if (text === null) {
      return
    }

    setCopyState((await copyText(text)) ? 'copied' : 'failed')
  }

  return (
    <>
      {copyState === 'idle' ? null : (
        <span role="status" className="font-mono text-2xs text-base-content/70">
          {copyState === 'copied' ? 'Copied' : 'Could not copy'}
        </span>
      )}
      <button
        type="button"
        aria-label="Copy source text"
        title="Copy source text"
        disabled={text === null}
        onClick={copy}
        className="rounded p-1 text-base-content/60 transition hover:bg-neutral/40 hover:text-base-content disabled:pointer-events-none disabled:opacity-40"
      >
        <Copy aria-hidden="true" className="h-3 w-3" />
      </button>
    </>
  )
}

export function StoryPane({
  source,
  creating,
  expanded,
  onToggle,
  onRetry
}: StoryPaneProps): JSX.Element {
  const [animating, setAnimating] = useState(false)
  const contentId = useId()
  const dispatch = useWorkspaceDispatch()
  const navigate = useWorkspaceNavigation()
  const storyId = source.kind === 'empty' ? '' : source.storyId

  const toggle = (): void => {
    setAnimating(true)
    onToggle()
  }

  return (
    <section
      aria-label="Source story"
      onTransitionEnd={(event) => {
        if (event.propertyName === 'width') {
          setAnimating(false)
        }
      }}
      className={cn(
        'flex min-h-0 shrink-0 flex-col overflow-hidden border-r border-base-300 bg-base-200/50',
        expanded ? 'w-[360px] min-w-[360px] xl:w-[420px] xl:min-w-[420px]' : 'w-10 min-w-10',
        animating &&
          'transition-[width,min-width] duration-200 ease-out motion-reduce:transition-none'
      )}
    >
      <div className="flex h-full min-h-0 w-[360px] flex-col xl:w-[420px]">
        <header className="flex h-9 min-h-9 items-center gap-2 border-b border-base-300 bg-base-200/80 px-2">
          <IconButton
            label="Toggle source story"
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={toggle}
            className="h-6 w-6 shrink-0"
          >
            {expanded ? (
              <PanelLeftClose aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftOpen aria-hidden="true" className="h-3.5 w-3.5" />
            )}
          </IconButton>

          <div
            hidden={!expanded}
            className={cn(
              'min-w-0 flex-1 items-center justify-between gap-2',
              expanded ? 'flex' : 'hidden'
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Lock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-warning/80" />
              <h2 className="truncate text-xs font-semibold text-base-content/85">Source story</h2>
              <span className="shrink-0 rounded border border-warning/20 bg-warning/15 px-1.5 py-0.5 font-mono text-2xs text-warning">
                Read-only
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <CopySourceAction
                key={storyId}
                text={source.kind === 'ready' ? source.story.Text : null}
              />
              {creating ? null : (
                <button
                  type="button"
                  aria-label="Open story in editor"
                  title="Open story in editor"
                  disabled={source.kind !== 'ready'}
                  onClick={() => navigate({ type: 'story/select', storyId })}
                  className="rounded p-1 text-base-content/60 transition hover:bg-neutral/40 hover:text-base-content disabled:pointer-events-none disabled:opacity-40"
                >
                  <SquarePen aria-hidden="true" className="h-3 w-3" />
                </button>
              )}
              {creating ? null : (
                <button
                  type="button"
                  aria-label="Delete story"
                  title="Delete story"
                  disabled={source.kind !== 'ready'}
                  onClick={() => dispatch({ type: 'dialog/open', dialog: 'delete-story', storyId })}
                  className="rounded p-1 text-error transition hover:bg-error/10 hover:text-error disabled:pointer-events-none disabled:opacity-40"
                >
                  <Trash2 aria-hidden="true" className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </header>

        <div
          id={contentId}
          hidden={!expanded}
          className={cn('min-h-0 flex-1 flex-col', expanded ? 'flex' : 'hidden')}
        >
          {storyId === '' ? null : (
            <div className="border-b border-base-300/60 bg-surface-raised px-4 py-2">
              <span className="block truncate font-mono text-2xs text-accent" title={storyId}>
                #{storyId}
              </span>
            </div>
          )}

          {source.kind === 'empty' ? (
            <div className="p-5">
              <p className="text-xs font-semibold text-base-content/80">No source story yet</p>
              <p className="mt-1 text-xs text-base-content/60">
                Choose a story for this article to preview it here.
              </p>
            </div>
          ) : source.kind === 'loading' ? (
            <p role="status" aria-busy="true" className="p-5 text-xs text-base-content/70">
              Loading source story…
            </p>
          ) : source.kind === 'error' ? (
            <ErrorState
              title="Source story could not be loaded"
              description="The app could not read your stories from the local database."
              onRetry={onRetry}
            />
          ) : source.kind === 'missing' ? (
            <p className="p-5 text-xs text-base-content/70">
              {creating
                ? 'The selected story is no longer available. Choose another story for this article.'
                : 'The story this article came from no longer exists.'}
            </p>
          ) : (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5 select-text">
              <h3 className="text-xs font-semibold text-secondary">{source.story.Topic}</h3>

              {source.story.Titles.length > 0 ? (
                <ul className="space-y-0.5 text-xs text-base-content/80">
                  {source.story.Titles.map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>
              ) : null}

              {source.story.Tags.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1">
                  {source.story.Tags.map((tag) => (
                    <TagChip key={tag} tag={tag} />
                  ))}
                </div>
              ) : null}

              <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-base-content/70">
                {source.story.Text}
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
