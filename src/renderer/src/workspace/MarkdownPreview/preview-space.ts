/**
 * Geometry of the preview's bottom spacer.
 *
 * The spacer gives the preview the same free scroll as the editor: at the
 * maximum scroll, the last line of the rendered article reaches the top edge
 * of the viewport, with a finite amount of blank space below it.
 */

/** Blank space below the article so `lastLineTop` can reach the top edge. */
export function bottomSpaceForLastLine(
  viewportHeight: number,
  articleHeight: number,
  lastLineTop: number
): number {
  return Math.max(0, viewportHeight - (articleHeight - lastLineTop))
}
