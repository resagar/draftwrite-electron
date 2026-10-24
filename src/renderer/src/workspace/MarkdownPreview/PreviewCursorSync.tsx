import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { browserFrameScheduler } from '../../scroll/smooth-scroll'
import { usePreviewLine } from '../../state/status-store'
import {
  createPreviewScrollAnimator,
  type PreviewScrollAnimator,
  type PreviewScrollReason
} from './preview-scroll-animator'
import { measurePreviewSync } from './preview-sync'

/** Elements of the preview the sync has to measure. Owned by `MarkdownPreview`. */
export type PreviewCursorSyncProps = {
  /** Signal only: a new string means the rendered DOM was replaced. */
  markdown: string
  containerRef: RefObject<HTMLElement | null>
  articleRef: RefObject<HTMLElement | null>
  topSpacerRef: RefObject<HTMLElement | null>
  bottomSpacerRef: RefObject<HTMLElement | null>
}

/** A caret line as it was followed, and whether any sync has happened yet. */
type FollowedLine = {
  synced: boolean
  line: number | null
}

/**
 * Keeps the preview on the source line of the editor caret.
 *
 * It is a child that renders `null` and subscribes to the line on its own, so a
 * caret move re-renders this component and nothing of `MarkdownPreview`: the
 * Markdown is not parsed again for every arrow key.
 *
 * The scroll itself belongs to `preview-scroll-animator.ts`: this component
 * measures a destination, decides whether it is a caret move or a layout
 * correction, and calls the animator. It never writes `scrollTop` itself.
 */
export function PreviewCursorSync({
  markdown,
  containerRef,
  articleRef,
  topSpacerRef,
  bottomSpacerRef
}: PreviewCursorSyncProps): null {
  const line = usePreviewLine()
  // Top spacer height of the previous sync; `null` until the first one. It is
  // what tells "the article moved because the spacers changed" apart, so a sync
  // without a cursor can keep the article where the reader left it.
  const previousTopSpacer = useRef<number | null>(null)
  const animatorRef = useRef<PreviewScrollAnimator | null>(null)
  // The line the preview followed last: a new caret line may animate, and a
  // markdown or geometry change with the same line may not.
  const followed = useRef<FollowedLine>({ synced: false, line: null })

  // One animator per scroller, and it dies with the preview: the wheel and the
  // pointer listeners, the scrollbar guard and the pending frame are all inside.
  useLayoutEffect(() => {
    const container = containerRef.current

    if (container === null) {
      return
    }

    const win = container.ownerDocument.defaultView ?? null
    const animator = createPreviewScrollAnimator({
      container,
      scheduler: browserFrameScheduler(win ?? window),
      win
    })
    animatorRef.current = animator

    return () => {
      animator.destroy()

      if (animatorRef.current === animator) {
        animatorRef.current = null
      }
    }
  }, [containerRef])

  // The single write point of the preview scroll. `layout` corrects the viewport
  // instantly; only `caret` is allowed to fly.
  const applyScroll = useCallback(
    (container: HTMLElement, target: number, reason: PreviewScrollReason, lineUnit: number) => {
      const animator = animatorRef.current

      if (animator === null || animator.container !== container) {
        return
      }

      animator.scrollTo(target, reason, lineUnit)
    },
    []
  )

  const sync = useCallback(
    (reason: PreviewScrollReason) => {
      const container = containerRef.current
      const article = articleRef.current
      const topSpacer = topSpacerRef.current
      const bottomSpacer = bottomSpacerRef.current
      const animator = animatorRef.current

      if (
        container === null ||
        article === null ||
        topSpacer === null ||
        bottomSpacer === null ||
        animator === null
      ) {
        return
      }

      // The spacers are about to be rewritten, which invalidates the
      // `scrollHeight` and the destination any flight was aiming at: it must be
      // stopped before the first write, not after it.
      animator.cancel('resync')

      const measurement = measurePreviewSync({ container, article, topSpacer, bottomSpacer, line })

      // No viewport to measure: jsdom, or the preview mounted in a hidden pane.
      // The measurement reads it (it writes no spacer and returns nothing), so
      // the lifecycle does not have to probe the geometry itself.
      if (measurement === null) {
        animator.cancel('hidden')

        return
      }

      const previous = previousTopSpacer.current
      previousTopSpacer.current = measurement.topSpacer

      if (measurement.target === null) {
        // Nothing to follow. Every sync but the first shifts the article by the
        // change of the top spacer, so it is compensated to keep it in place. The
        // first one does not: the spacers are already in place before the first
        // paint, and compensating would hide the centring of the first block.
        if (previous !== null) {
          applyScroll(
            container,
            container.scrollTop + measurement.topSpacer - previous,
            // A compensation keeps the reader where they were: never a flight.
            'layout',
            measurement.lineUnit
          )
        }

        return
      }

      applyScroll(container, measurement.target, reason, measurement.lineUnit)
    },
    [articleRef, applyScroll, bottomSpacerRef, containerRef, line, topSpacerRef]
  )

  // The observer must call the latest closure without being recreated on every
  // caret move.
  const syncRef = useRef(sync)

  useLayoutEffect(() => {
    syncRef.current = sync

    const previous = followed.current
    // Only a new caret line may animate. A markdown change, a resize and the
    // first sync move the viewport, not the caret, so they land at once.
    const reason: PreviewScrollReason =
      previous.synced && line !== null && line !== previous.line ? 'caret' : 'layout'
    followed.current = { synced: true, line }

    // Measures and applies the destination before the browser paints, so the
    // spacers and the scroll never show an intermediate state.
    sync(reason)
  }, [sync, markdown, line])

  useEffect(() => {
    // jsdom has none, and a missing observer only means "re-measure on the next
    // caret event": the preview still works.
    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const container = containerRef.current
    const article = articleRef.current

    if (container === null || article === null) {
      return
    }

    // The container carries viewport resizes; the article carries late images
    // and fonts. The spacers are not observed: writing them changes
    // `scrollHeight`, not the size of anything observed.
    const observer = new ResizeObserver(() => syncRef.current('layout'))
    observer.observe(container)
    observer.observe(article)

    return () => observer.disconnect()
  }, [containerRef, articleRef])

  return null
}
