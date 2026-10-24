/**
 * Annotate every source line that carries text with an empty
 * `<span data-source-line="N">` marker at its start, so the preview can follow
 * the editor caret line by line.
 *
 * Must run BEFORE `remark-breaks`: after it, text nodes have no `position`
 * (`mdast-util-find-and-replace` rebuilds them without positional info). The
 * plugin therefore splits text nodes at line endings itself and emits the
 * `break` nodes `remark-breaks` would emit; `remark-breaks` then finds nothing
 * to replace and stays as a defence in depth.
 *
 * Types are declared locally: `@types/mdast` is not a direct dependency of the
 * project, and only the few fields this plugin touches are needed.
 */
import {
  SOURCE_LINE_ATTRIBUTE,
  countLineEndings,
  splitTextIntoSourceLines,
  trimLeadingMarkdownSpace
} from './source-lines'

type MdPoint = { line: number; column?: number; offset?: number }

type MdPosition = { start: MdPoint; end: MdPoint }

/** Minimal structural mdast node: only what this plugin reads or writes. */
export type MdNode = {
  type: string
  value?: string
  children?: MdNode[]
  position?: MdPosition
  data?: { hName?: string; hProperties?: Record<string, string | number> }
}

/** The marker as `mdast-util-to-hast` compiles it: an empty `span`. */
function sourceLineMarker(line: number): MdNode {
  return {
    type: 'text',
    value: '',
    data: { hName: 'span', hProperties: { [SOURCE_LINE_ATTRIBUTE]: line } }
  }
}

/**
 * `lastLine` is the last line that got a marker. It is shared by the whole
 * document traversal, so a line with several text nodes gets a single marker.
 */
type MarkerState = { lastLine: number }

function annotateText(node: MdNode, afterBreak: boolean, state: MarkerState): MdNode[] {
  const startLine = node.position?.start.line

  // No position: nothing to anchor. The line falls back to its block anchor.
  if (startLine === undefined) {
    return [node]
  }

  const value = node.value ?? ''
  const result: MdNode[] = []
  const marker = (line: number): void => {
    if (line !== state.lastLine) {
      result.push(sourceLineMarker(line))
      state.lastLine = line
    }
  }

  marker(startLine)

  // Single line: the node survives as is, after trimming the space that
  // `mdast-util-to-hast` would have trimmed had the marker not been inserted.
  if (countLineEndings(value) === 0) {
    result.push(afterBreak ? { ...node, value: trimLeadingMarkdownSpace(value) } : node)
    return result
  }

  for (const segment of splitTextIntoSourceLines(value, startLine)) {
    if (segment.line !== startLine) {
      result.push({ type: 'break' })
      marker(segment.line)
    }

    result.push({ ...node, value: segment.value })
  }

  return result
}

function annotateChildren(children: MdNode[], state: MarkerState): MdNode[] {
  const result: MdNode[] = []

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index]

    if (child.type === 'text') {
      const afterBreak = index > 0 && children[index - 1]?.type === 'break'
      result.push(...annotateText(child, afterBreak, state))
      continue
    }

    if (child.children) {
      child.children = annotateChildren(child.children, state)
    }

    result.push(child)
  }

  return result
}

/** remark plugin: place it before `remarkBreaks` in the plugin list. */
export function remarkSourceLineMarkers(): (tree: MdNode) => void {
  return (tree: MdNode): void => {
    tree.children = annotateChildren(tree.children ?? [], { lastLine: 0 })
  }
}
