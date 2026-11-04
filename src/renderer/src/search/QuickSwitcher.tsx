import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type JSX, type KeyboardEvent } from 'react'
import { excerpt, formatRelativeDate } from '../data/format'
import { POST_STATE_BADGES, POST_STATE_LABELS } from '../data/post-state'
import { cn } from '../lib/cn'
import { useLibrary } from '../state/library-context'
import { usePlatformModifier } from '../state/use-platform'
import type { LoadStatus } from '../state/use-list'
import { Kbd } from '../ui/Kbd/Kbd'
import {
  buildEntries,
  groupResults,
  searchEntries,
  ENTRY_KIND_LABELS,
  ENTRY_KIND_NAMES,
  type EntryKind,
  type SearchEntry,
  type SearchResult
} from './search'

type QuickSwitcherProps = {
  onClose: () => void
  onOpen: (entry: SearchEntry) => void
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const GROUP_HEADING_COLORS: Record<EntryKind, string> = {
  story: 'text-accent',
  article: 'text-secondary',
  post: 'text-success'
}

function optionId(entry: SearchEntry): string {
  return `quick-switcher-option-${entry.kind}-${entry.id}`
}

function HighlightedTitle({ title, matches }: { title: string; matches: number[] }): JSX.Element {
  if (matches.length === 0) {
    return <>{title}</>
  }

  const highlighted = new Set(matches)

  return (
    <>
      {title.split('').map((character, index) =>
        highlighted.has(index) ? (
          <mark key={index} className="bg-primary/30 text-inherit">
            {character}
          </mark>
        ) : (
          <span key={index}>{character}</span>
        )
      )}
    </>
  )
}

export function QuickSwitcher({ onClose, onOpen }: QuickSwitcherProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  )
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const modifier = usePlatformModifier()
  const {
    allStories,
    allArticles,
    allPosts,
    storiesStatus,
    articlesStatus,
    postsStatus,
    reloadStories,
    reloadArticles,
    reloadPosts
  } = useLibrary()

  const entries = useMemo(
    () => buildEntries({ stories: allStories, articles: allArticles, posts: allPosts }),
    [allStories, allArticles, allPosts]
  )
  const results = useMemo(() => searchEntries(entries, query), [entries, query])

  const statusFor: Record<EntryKind, LoadStatus> = {
    story: storiesStatus,
    article: articlesStatus,
    post: postsStatus
  }
  const reloadFor: Record<EntryKind, () => void> = {
    story: reloadStories,
    article: reloadArticles,
    post: reloadPosts
  }
  const resultsByKind = new Map(groupResults(results).map((group) => [group.kind, group.results]))

  const groups: Array<{
    kind: EntryKind
    label: string
    status: LoadStatus
    reload: () => void
    results: SearchResult[]
  }> = (['story', 'article', 'post'] as const).map((kind) => ({
    kind,
    label: ENTRY_KIND_LABELS[kind],
    status: statusFor[kind],
    reload: reloadFor[kind],
    results: resultsByKind.get(kind) ?? []
  }))

  // Keyboard navigation follows the rendered order (grouped by kind), not the
  // global score order.
  const ordered = groups.flatMap((group) => group.results)
  const safeIndex = ordered.length === 0 ? 0 : Math.min(activeIndex, ordered.length - 1)
  const active = ordered[safeIndex]
  const activeId = active === undefined ? undefined : optionId(active.entry)

  useEffect(() => {
    inputRef.current?.focus()

    const previous = previouslyFocused.current

    return () => {
      if (previous !== null && document.contains(previous)) {
        previous.focus()
      }
    }
  }, [])

  useEffect(() => {
    if (activeId === undefined) {
      return
    }

    document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' })
  }, [activeId])

  const visibleGroups = groups.filter(
    (group) => group.status !== 'ready' || group.results.length > 0
  )
  const allReady = groups.every((group) => group.status === 'ready')
  const loadedEmpty = allReady && entries.length === 0
  const noMatches =
    query.trim() !== '' &&
    results.length === 0 &&
    !loadedEmpty &&
    groups.every((group) => group.status === 'ready')

  const indexById = new Map(ordered.map((result, index) => [optionId(result.entry), index]))

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (ordered.length > 0) {
        setActiveIndex(Math.min(safeIndex + 1, ordered.length - 1))
      }
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (ordered.length > 0) {
        setActiveIndex(Math.max(safeIndex - 1, 0))
      }
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      if (ordered.length > 0) {
        setActiveIndex(ordered.length - 1)
      }
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (active !== undefined) {
        onOpen(active.entry)
      }
    }
  }

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key !== 'Tab') {
      return
    }

    const panel = panelRef.current
    if (panel === null) {
      return
    }

    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.offsetParent !== null
    )
    if (focusable.length === 0) {
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-base-300/80 px-4 pt-[12vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Quick switcher"
        onKeyDown={handlePanelKeyDown}
        className="flex max-h-[60vh] w-full max-w-[640px] flex-col overflow-hidden rounded border border-line bg-base-100 shadow-lg"
      >
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-base-content/60" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls="quick-switcher-results"
            aria-activedescendant={activeId}
            aria-label="Search stories, articles and posts"
            placeholder="Search stories, articles and posts…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleInputKeyDown}
            className="min-w-0 flex-1 bg-transparent text-sm text-base-content outline-none placeholder:text-base-content/50"
          />
        </div>

        <div
          id="quick-switcher-results"
          role="listbox"
          aria-label="Search results"
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {loadedEmpty ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-base-content/80">Nothing to open yet</p>
              <p className="mt-1 text-xs text-base-content/60">
                Stories, articles and posts you write will show up here.
              </p>
              <p className="mt-2 flex items-center justify-center gap-1 text-2xs text-base-content/60">
                Press <Kbd>{modifier}</Kbd> <Kbd>N</Kbd> to create one.
              </p>
            </div>
          ) : null}

          {noMatches ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-base-content/80">No matches</p>
              <p className="mt-1 text-xs text-base-content/60">Nothing matches “{query.trim()}”.</p>
            </div>
          ) : null}

          {visibleGroups.map((group, groupIndex) => (
            <div
              key={group.kind}
              role="group"
              aria-label={group.label}
              className={groupIndex > 0 ? 'mt-1' : undefined}
            >
              <p
                aria-hidden="true"
                className={cn(
                  'border-t border-line px-3 pt-2 pb-1 text-2xs font-semibold tracking-wider uppercase',
                  GROUP_HEADING_COLORS[group.kind]
                )}
              >
                {group.label}
              </p>

              {group.status === 'loading' ? (
                <p className="px-3 py-2 text-xs text-base-content/60">
                  Loading {group.label.toLowerCase()}…
                </p>
              ) : null}

              {group.status === 'error' ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-base-content/70">
                  <span>{group.label} could not be loaded.</span>
                  <button
                    type="button"
                    onClick={group.reload}
                    className="rounded border border-line-strong bg-neutral px-2 py-1 text-xs font-medium text-base-content transition hover:bg-neutral/80"
                  >
                    Retry
                  </button>
                </div>
              ) : null}

              {group.results.map((result) => {
                const id = optionId(result.entry)
                const index = indexById.get(id) ?? 0
                const selected = index === safeIndex

                return (
                  <div
                    key={id}
                    id={id}
                    role="option"
                    aria-selected={selected}
                    onClick={() => onOpen(result.entry)}
                    className={cn(
                      'cursor-pointer border-l-2 px-3 py-2 transition',
                      selected
                        ? 'border-primary bg-neutral'
                        : 'border-transparent hover:bg-neutral/40'
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs font-medium text-base-content/90">
                        <HighlightedTitle
                          title={result.entry.title}
                          matches={result.titleMatches}
                        />
                      </span>
                      <span className="shrink-0 font-mono text-2xs text-base-content/60">
                        {formatRelativeDate(result.entry.updatedAt)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded border border-line px-1.5 py-0.5 font-mono text-2xs text-base-content/70">
                        {ENTRY_KIND_NAMES[result.entry.kind]}
                      </span>
                      {result.entry.context !== null && result.entry.state === null ? (
                        <span className="truncate text-2xs text-base-content/60">
                          {result.entry.context}
                        </span>
                      ) : null}
                      {result.entry.state !== null ? (
                        <span
                          className={cn(
                            'rounded border px-1.5 py-0.5 font-mono text-2xs',
                            POST_STATE_BADGES[result.entry.state]
                          )}
                        >
                          {POST_STATE_LABELS[result.entry.state]}
                        </span>
                      ) : null}
                    </div>

                    {result.entry.text !== '' ? (
                      <p className="mt-1 line-clamp-1 text-2xs text-base-content/60">
                        {excerpt(result.entry.text)}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <footer className="flex items-center gap-3 border-t border-line px-3 py-1.5 text-2xs text-base-content/60">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> open
          </span>
          <span className="flex items-center gap-1">
            <Kbd>esc</Kbd> close
          </span>
        </footer>
      </div>
    </div>
  )
}
