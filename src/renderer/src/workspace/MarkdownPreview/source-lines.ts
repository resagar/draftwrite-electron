/**
 * Pure helpers behind the per-source-line annotation of the preview.
 *
 * The preview follows the editor caret by source line, so every line that
 * carries text gets an empty `<span data-source-line="N">` marker at its start.
 * These helpers hold the arithmetic so it can be tested without a Markdown
 * pipeline (`remark-source-line-markers`, `rehype-code-line-markers`) or a
 * browser (`findTarget` in the preview scroller).
 */

/** Attribute of a per-line marker. Anchors use `data-source-start-line`. */
export const SOURCE_LINE_ATTRIBUTE = 'data-source-line'

/** Attribute of a block anchor; `start` is the first line of the block. */
export const SOURCE_START_LINE_ATTRIBUTE = 'data-source-start-line'

/** Attribute of a block anchor; `end` is the last line of the block. */
export const SOURCE_END_LINE_ATTRIBUTE = 'data-source-end-line'

/** One line of a text node, with the source line it belongs to. */
export type SourceLine = { line: number; value: string }

const LINE_END = /\r?\n|\r/
const LINE_END_ALL = /\r?\n|\r/g

/**
 * Splits `value` by its line endings and numbers the segments from `startLine`.
 *
 * Leading spaces and tabs of every segment after the first are trimmed: that is
 * what `mdast-util-to-hast` does to the node that follows a `break`, and the
 * marker is inserted in between, so the plugin has to do it instead to keep the
 * rendered text byte-identical.
 */
export function splitTextIntoSourceLines(value: string, startLine: number): SourceLine[] {
  return value.split(LINE_END).map((segment, index) => ({
    line: startLine + index,
    value: index === 0 ? segment : trimLeadingMarkdownSpace(segment)
  }))
}

/** Mirrors `trimMarkdownSpaceStart` from `mdast-util-to-hast`. */
export function trimLeadingMarkdownSpace(value: string): string {
  let index = 0
  let code = value.charCodeAt(index)

  while (code === 9 || code === 32) {
    index += 1
    code = value.charCodeAt(index)
  }

  return index === 0 ? value : value.slice(index)
}

/**
 * First content line of a code block, from the extent of the block and how many
 * lines its value has.
 *
 * A fenced block adds one line (unclosed) or two (closed) that are not content;
 * an indented block adds none. Without the fence flag in mdast, the extent is
 * the only signal: a block that spans more lines than its value must start one
 * line below its own start.
 */
export function firstCodeLine(startLine: number, endLine: number, lineCount: number): number {
  const span = endLine - startLine + 1
  return startLine + (span > lineCount ? 1 : 0)
}

/**
 * Marker line closest to `line`, or `null` when the block has no markers.
 *
 * Used when a source line has no marker of its own (a blank line, a fence, a
 * setext underline, a table delimiter): the block anchors say which block
 * contains the line, and this picks the line inside it to centre. Ties go to
 * the previous line, so a delimiter snaps to the header row above it.
 */
export function nearestMarkerLine(lines: readonly number[], line: number): number | null {
  let nearest: number | null = null
  let distance = Number.POSITIVE_INFINITY

  for (const candidate of lines) {
    const candidateDistance = Math.abs(candidate - line)

    if (candidateDistance < distance) {
      nearest = candidate
      distance = candidateDistance
    }
  }

  return nearest
}

/** Counts the line endings of a value; `0` means the text is a single line. */
export function countLineEndings(value: string): number {
  const matches = value.match(LINE_END_ALL)
  return matches === null ? 0 : matches.length
}

/** Lines of a code value, dropping the trailing empty segment of its last `\n`. */
export function splitCodeValue(value: string): { lines: string[]; trailingNewline: boolean } {
  const lines = value.split('\n')
  const trailingNewline = lines.length > 0 && lines[lines.length - 1] === ''

  if (trailingNewline) {
    lines.pop()
  }

  return { lines, trailingNewline }
}
