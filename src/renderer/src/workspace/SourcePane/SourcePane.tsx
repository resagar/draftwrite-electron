import { Copy, Lock, PanelLeftClose, PanelLeftOpen, SquarePen, Trash2 } from 'lucide-react'
import { useId, useState, type JSX, type ReactNode } from 'react'
import { copyText } from '../../data/clipboard'
import type { Article, Story } from '../../data/types'
import { cn } from '../../lib/cn'
import { useWorkspaceNavigation } from '../../state/use-navigation'
import { useWorkspaceDispatch } from '../../state/workspace-context'
import { ErrorState } from '../../ui/ErrorState/ErrorState'
import { IconButton } from '../../ui/IconButton/IconButton'
import { Resizer } from '../../ui/Resizer/Resizer'
import { usePanelResizer } from '../../ui/Resizer/use-resizer'
import { TagChip } from '../../ui/TagChip/TagChip'

export type SourceContent =
  { kind: 'story'; story: Story } | { kind: 'article'; article: Article; story: Story | null }

export type SourceState =
  | { kind: 'empty' }
  | { kind: 'loading'; sourceId: string }
  | { kind: 'error'; sourceId: string }
  | { kind: 'missing'; sourceId: string }
  | { kind: 'ready'; content: SourceContent }

/** What the source belongs to; only the copy for the empty and missing states changes. */
export type SourceSubject = 'article' | 'post'

type SourcePaneProps = {
  source: SourceState
  subject: SourceSubject
  creating: boolean
  expanded: boolean
  onToggle: () => void
  onRetry: () => void
  /** Extra pane pinned below the source, sized as a quarter of the content. */
  footer?: ReactNode
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

export function SourcePane({
  source,
  subject,
  creating,
  expanded,
  onToggle,
  onRetry,
  footer
}: SourcePaneProps): JSX.Element {
  const [animating, setAnimating] = useState(false)
  const contentId = useId()
  const dispatch = useWorkspaceDispatch()
  const navigate = useWorkspaceNavigation()
  const content = source.kind === 'ready' ? source.content : null
  const isArticle = content?.kind === 'article'
  const label = isArticle ? 'Source article' : 'Source story'
  const sourceId =
    source.kind === 'empty'
      ? ''
      : source.kind === 'ready'
        ? content?.kind === 'article'
          ? content.article.ID
          : content?.kind === 'story'
            ? content.story.ID
            : ''
        : source.sourceId
  const sourceText =
    content === null ? null : content.kind === 'article' ? content.article.Text : content.story.Text
  const { size, resizerProps } = usePanelResizer({
    storageKey: 'story',
    defaultSize: 360,
    min: 240,
    max: 560,
    label: `Resize ${label.toLowerCase()}`
  })

  const toggle = (): void => {
    setAnimating(true)
    onToggle()
  }

  return (
    <section
      aria-label={label}
      style={expanded ? { width: size, minWidth: size } : undefined}
      onTransitionEnd={(event) => {
        if (event.propertyName === 'width') {
          setAnimating(false)
        }
      }}
      className={cn(
        'relative flex min-h-0 shrink-0 flex-col overflow-hidden border-r border-base-300 bg-base-200/50',
        expanded ? '' : 'w-10 min-w-10',
        animating &&
          'transition-[width,min-width] duration-200 ease-out motion-reduce:transition-none'
      )}
    >
      <div className="flex h-full min-h-0 w-full flex-col">
        {expanded && footer !== undefined ? (
          <div className="h-1/4 min-h-0 shrink-0 border-b border-base-300/60">{footer}</div>
        ) : null}

        <header className="flex h-9 min-h-9 items-center gap-2 border-b border-base-300 bg-base-200/80 px-2">
          <IconButton
            label={`Toggle ${label.toLowerCase()}`}
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
              <h2 className="truncate text-xs font-semibold text-base-content/85">{label}</h2>
              <span className="shrink-0 rounded border border-warning/20 bg-warning/15 px-1.5 py-0.5 font-mono text-2xs text-warning">
                Read-only
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <CopySourceAction key={sourceId} text={sourceText} />
              {creating || isArticle ? null : (
                <button
                  type="button"
                  aria-label="Open story in editor"
                  title="Open story in editor"
                  disabled={source.kind !== 'ready'}
                  onClick={() => navigate({ type: 'story/select', storyId: sourceId })}
                  className="rounded p-1 text-base-content/60 transition hover:bg-neutral/40 hover:text-base-content disabled:pointer-events-none disabled:opacity-40"
                >
                  <SquarePen aria-hidden="true" className="h-3 w-3" />
                </button>
              )}
              {creating || isArticle ? null : (
                <button
                  type="button"
                  aria-label="Delete story"
                  title="Delete story"
                  disabled={source.kind !== 'ready'}
                  onClick={() =>
                    dispatch({
                      type: 'dialog/open',
                      request: { kind: 'delete-story', storyId: sourceId }
                    })
                  }
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
          {sourceId === '' ? null : (
            <div className="border-b border-base-300/60 bg-surface-raised px-4 py-2">
              <span className="block truncate font-mono text-2xs text-accent" title={sourceId}>
                #{sourceId}
              </span>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {source.kind === 'empty' ? (
              <div className="p-5">
                <p className="text-xs font-semibold text-base-content/80">
                  {subject === 'post' ? 'No source yet' : 'No source story yet'}
                </p>
                <p className="mt-1 text-xs text-base-content/60">
                  {subject === 'post'
                    ? 'Choose a story or an article for this post to preview it here.'
                    : 'Choose a story for this article to preview it here.'}
                </p>
              </div>
            ) : source.kind === 'loading' ? (
              <p role="status" aria-busy="true" className="p-5 text-xs text-base-content/70">
                {isArticle ? 'Loading source article…' : 'Loading source story…'}
              </p>
            ) : source.kind === 'error' ? (
              <ErrorState
                title={
                  isArticle
                    ? 'Source article could not be loaded'
                    : 'Source story could not be loaded'
                }
                description={
                  isArticle
                    ? 'The app could not read your articles from the local database.'
                    : 'The app could not read your stories from the local database.'
                }
                onRetry={onRetry}
              />
            ) : source.kind === 'missing' ? (
              <p className="p-5 text-xs text-base-content/70">
                {creating
                  ? subject === 'post'
                    ? 'The selected source is no longer available. Choose another source for this post.'
                    : 'The selected story is no longer available. Choose another story for this article.'
                  : subject === 'post'
                    ? 'The source this post came from no longer exists.'
                    : 'The story this article came from no longer exists.'}
              </p>
            ) : content?.kind === 'story' ? (
              <div className="space-y-3 p-5 select-text">
                <h3 className="text-[14px] leading-loose font-semibold text-secondary">
                  {content.story.Topic}
                </h3>

                {content.story.Titles.length > 0 ? (
                  <ul className="space-y-0.5 text-[14px] leading-loose text-base-content/80">
                    {content.story.Titles.map((title) => (
                      <li key={title}>{title}</li>
                    ))}
                  </ul>
                ) : null}

                {content.story.Tags.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1">
                    {content.story.Tags.map((tag) => (
                      <TagChip key={tag} tag={tag} />
                    ))}
                  </div>
                ) : null}

                <pre className="font-mono text-[14px] leading-loose whitespace-pre-wrap text-base-content/70">
                  {content.story.Text}
                </pre>
              </div>
            ) : content?.kind === 'article' ? (
              <div className="space-y-3 p-5 select-text">
                <h3 className="text-[14px] leading-loose font-semibold text-secondary">
                  {content.article.Title}
                </h3>

                {content.article.Subtitle !== '' ? (
                  <p className="text-[14px] leading-loose text-base-content/80">
                    {content.article.Subtitle}
                  </p>
                ) : null}

                {content.article.Target !== '' ? (
                  <p className="text-[14px] leading-loose text-base-content/60">
                    <span className="font-mono text-2xs tracking-wider uppercase">Target </span>
                    {content.article.Target}
                  </p>
                ) : null}

                {content.story !== null ? (
                  <p className="text-2xs text-base-content/60">
                    <span className="font-mono tracking-wider uppercase">From </span>
                    {content.story.Topic}
                  </p>
                ) : null}

                <pre className="font-mono text-[14px] leading-loose whitespace-pre-wrap text-base-content/70">
                  {content.article.Text}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {expanded ? <Resizer {...resizerProps} className="absolute inset-y-0 right-0 z-10" /> : null}
    </section>
  )
}
