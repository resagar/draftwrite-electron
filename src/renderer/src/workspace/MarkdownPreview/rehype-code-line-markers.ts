/**
 * Split the content of `pre > code` into one `<span data-source-line="N">` per
 * line, so a code block can be followed line by line like prose.
 *
 * A code block is not annotated by the remark plugin: `mdast-util-to-hast`
 * compiles it into a `pre > code` with a single (position-less) text child, so
 * it has to be done on the hast tree.
 *
 * Types are declared locally: `@types/hast` is not a direct dependency.
 */
import { SOURCE_LINE_ATTRIBUTE, firstCodeLine, splitCodeValue } from './source-lines'

type HastPoint = { line: number; column?: number; offset?: number }

type HastPosition = { start: HastPoint; end: HastPoint }

/** Minimal structural hast node: only what this plugin reads or writes. */
export type HastNode = {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
  position?: HastPosition
}

function codeElementOf(pre: HastNode): HastNode | undefined {
  return pre.children?.find((child) => child.type === 'element' && child.tagName === 'code')
}

function lineSpan(line: number, value: string): HastNode {
  return {
    type: 'element',
    tagName: 'span',
    properties: { [SOURCE_LINE_ATTRIBUTE]: line },
    children: value === '' ? [] : [{ type: 'text', value }]
  }
}

function annotatePre(pre: HastNode): void {
  const startLine = pre.position?.start.line
  const endLine = pre.position?.end.line
  const code = codeElementOf(pre)

  if (startLine === undefined || endLine === undefined || !code) {
    return
  }

  // Only the plain `pre > code > text` shape is annotated; anything else (raw
  // HTML, a plugin that already rewrote the block) is left alone.
  if (code.children?.length !== 1 || code.children[0]?.type !== 'text') {
    return
  }

  const { lines, trailingNewline } = splitCodeValue(code.children[0].value ?? '')
  const firstLine = firstCodeLine(startLine, endLine, lines.length)
  // Keep the newlines between the lines (and the trailing one) so the text
  // content of the block and `white-space: pre` rows stay exactly as they were.
  const children: HastNode[] = []

  lines.forEach((line, index) => {
    if (index > 0) {
      children.push({ type: 'text', value: '\n' })
    }

    children.push(lineSpan(firstLine + index, line))
  })

  if (trailingNewline) {
    children.push({ type: 'text', value: '\n' })
  }

  code.children = children
}

function walk(node: HastNode): void {
  for (const child of node.children ?? []) {
    walk(child)
  }

  if (node.type === 'element' && node.tagName === 'pre') {
    annotatePre(node)
  }
}

/** rehype plugin: pass it in `rehypePlugins`. */
export function rehypeCodeLineMarkers(): (tree: HastNode) => void {
  return (tree: HastNode): void => {
    walk(tree)
  }
}
