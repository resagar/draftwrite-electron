import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { usePreviewLine } from '../../state/status-store'
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

/**
 * Applies a scroll destination to the preview.
 *
 * This is the only place that moves the preview. Ticket 08 swaps the assignment
 * for the shared animator (`createScrollAnimator(...).request(target, {
 * reason })`) and adds the cancelling listeners; nothing else changes.
 */
function applyScroll(container: HTMLElement, target: number): void {
  container.scrollTop = target
}

/**
 * Keeps the preview on the source line of the editor caret.
 *
 * It is a child that renders `null` and subscribes to the line on its own, so a
 * caret move re-renders this component and nothing of `MarkdownPreview`: the
 * Markdown is not parsed again for every arrow key.
 *
 * With no animation yet, the destination is written once per sync. Wheel and
 * scrollbar still own the preview between caret events.
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

  const sync = useCallback(() => {
    const container = containerRef.current
    const article = articleRef.current
    const topSpacer = topSpacerRef.current
    const bottomSpacer = bottomSpacerRef.current

    if (container === null || article === null || topSpacer === null || bottomSpacer === null) {
      return
    }

    const measurement = measurePreviewSync({ container, article, topSpacer, bottomSpacer, line })

    // No viewport to measure: jsdom, or the preview mounted in a hidden pane.
    if (measurement === null) {
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
        applyScroll(container, container.scrollTop + measurement.topSpacer - previous)
      }

      return
    }

    applyScroll(container, measurement.target)
  }, [containerRef, articleRef, topSpacerRef, bottomSpacerRef, line])

  // The observer must call the latest closure without being recreated on every
  // caret move.
  const syncRef = useRef(sync)

  useLayoutEffect(() => {
    syncRef.current = sync
    // Measures and applies the destination before the browser paints, so the
    // spacers and the scroll never show an intermediate state.
    // No animation yet: there is nothing to cancel here.
    sync()
  }, [sync, markdown])

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
    const observer = new ResizeObserver(() => syncRef.current())
    observer.observe(container)
    observer.observe(article)

    return () => observer.disconnect()
  }, [containerRef, articleRef])

  return null
}
