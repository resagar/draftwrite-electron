import type { Components } from 'react-markdown'
import type { JSX } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { rehypeCodeLineMarkers } from './rehype-code-line-markers'
import { remarkSourceLineMarkers } from './remark-source-line-markers'
import { SOURCE_END_LINE_ATTRIBUTE, SOURCE_START_LINE_ATTRIBUTE } from './source-lines'

// `remarkSourceLineMarkers` must come before `remarkBreaks`: it splits text
// nodes at line endings (keeping their positions) and emits the breaks itself.
const PLUGINS = [remarkGfm, remarkSourceLineMarkers, remarkBreaks]
const REHYPE_PLUGINS = [rehypeCodeLineMarkers]

/** Minimal structural shape of the hast node react-markdown passes as `node`. */
type PreviewNode = {
  position?: { start: { line: number }; end: { line: number } }
}

/** Block anchors: the fallback target for a source line without a marker. */
function blockAnchors(node: PreviewNode | undefined): Record<string, number> {
  const position = node?.position

  if (!position) {
    return {}
  }

  return {
    [SOURCE_START_LINE_ATTRIBUTE]: position.start.line,
    [SOURCE_END_LINE_ATTRIBUTE]: position.end.line
  }
}

const COMPONENTS: Components = {
  h1: ({ children, node }) => (
    <h1
      {...blockAnchors(node)}
      className="mb-4 border-b border-base-300 pb-2 font-sans text-2xl font-bold tracking-tight text-secondary"
    >
      {children}
    </h1>
  ),
  h2: ({ children, node }) => (
    <h2
      {...blockAnchors(node)}
      className="mt-6 mb-2.5 font-sans text-base font-semibold tracking-tight text-secondary"
    >
      {children}
    </h2>
  ),
  h3: ({ children, node }) => (
    <h3
      {...blockAnchors(node)}
      className="mt-4 mb-2 font-sans text-sm font-semibold text-secondary"
    >
      {children}
    </h3>
  ),
  // h4-h6 were rendered by react-markdown's defaults before: no class, so the
  // markup stays identical apart from the anchors.
  h4: ({ children, node }) => <h4 {...blockAnchors(node)}>{children}</h4>,
  h5: ({ children, node }) => <h5 {...blockAnchors(node)}>{children}</h5>,
  h6: ({ children, node }) => <h6 {...blockAnchors(node)}>{children}</h6>,
  p: ({ children, node }) => (
    <p
      {...blockAnchors(node)}
      className="mb-4 font-sans text-sm leading-relaxed text-base-content/90"
    >
      {children}
    </p>
  ),
  a: ({ children, href }) => (
    <a href={href} className="text-info underline hover:text-info/80">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-accent">{children}</strong>,
  em: ({ children }) => <em className="font-serif text-warning italic">{children}</em>,
  blockquote: ({ children, node }) => (
    <blockquote
      {...blockAnchors(node)}
      className="my-4 rounded-r border-l-2 border-secondary/70 bg-base-200/40 py-1.5 pl-3.5 font-sans text-sm text-base-content/75 italic"
    >
      {children}
    </blockquote>
  ),
  ul: ({ children, node }) => (
    <ul
      {...blockAnchors(node)}
      className="mb-4 list-disc space-y-1.5 pl-5 font-sans text-sm text-base-content/80 marker:text-primary"
    >
      {children}
    </ul>
  ),
  ol: ({ children, node }) => (
    <ol
      {...blockAnchors(node)}
      className="mb-4 list-decimal space-y-1.5 pl-5 font-sans text-sm text-base-content/80 marker:text-primary"
    >
      {children}
    </ol>
  ),
  // `li` has no styling of its own but carries remark-gfm's `task-list-item`
  // class, so the rest of the props are forwarded.
  li: ({ children, node, ...rest }) => (
    <li {...rest} {...blockAnchors(node)}>
      {children}
    </li>
  ),
  code: ({ children }) => (
    <code className="rounded bg-base-300 px-1 py-0.5 font-mono text-xs text-success">
      {children}
    </code>
  ),
  pre: ({ children, node }) => (
    <pre
      {...blockAnchors(node)}
      className="my-3 overflow-x-auto rounded border border-line bg-base-300 p-3 font-mono text-xs leading-relaxed text-base-content/90"
    >
      {children}
    </pre>
  ),
  table: ({ children, node }) => (
    <div {...blockAnchors(node)} className="my-3 overflow-x-auto">
      <table className="w-full border-collapse font-sans text-xs text-base-content/85">
        {children}
      </table>
    </div>
  ),
  tr: ({ children, node, ...rest }) => (
    <tr {...rest} {...blockAnchors(node)}>
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="border border-line px-2 py-1 text-left font-semibold text-base-content">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border border-line px-2 py-1">{children}</td>,
  del: ({ children }) => <del className="text-base-content/60">{children}</del>,
  hr: ({ node }) => <hr {...blockAnchors(node)} className="my-4 border-base-300" />
}

export function MarkdownPreview({ markdown }: { markdown: string }): JSX.Element {
  return (
    <section aria-label="Preview" className="min-w-0 flex-1">
      <article className="mx-auto max-w-[560px] p-8 select-text">
        <ReactMarkdown
          remarkPlugins={PLUGINS}
          rehypePlugins={REHYPE_PLUGINS}
          components={COMPONENTS}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    </section>
  )
}
