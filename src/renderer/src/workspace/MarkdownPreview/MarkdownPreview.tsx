import type { Components } from 'react-markdown'
import type { JSX } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const PLUGINS = [remarkGfm]

const COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 border-b border-base-300 pb-2 font-sans text-2xl font-bold tracking-tight text-secondary">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-6 mb-2.5 font-sans text-base font-semibold tracking-tight text-secondary">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-2 font-sans text-sm font-semibold text-secondary">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-4 font-sans text-sm leading-relaxed text-base-content/90">{children}</p>
  ),
  a: ({ children, href }) => (
    <a href={href} className="text-info underline hover:text-info/80">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-accent">{children}</strong>,
  em: ({ children }) => <em className="font-serif text-warning italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-r border-l-2 border-secondary/70 bg-base-200/40 py-1.5 pl-3.5 font-sans text-sm text-base-content/75 italic">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-1.5 pl-5 font-sans text-sm text-base-content/80 marker:text-primary">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-1.5 pl-5 font-sans text-sm text-base-content/80 marker:text-primary">
      {children}
    </ol>
  ),
  code: ({ children }) => (
    <code className="rounded bg-base-300 px-1 py-0.5 font-mono text-xs text-success">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded border border-line bg-base-300 p-3 font-mono text-xs leading-relaxed text-base-content/90">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse font-sans text-xs text-base-content/85">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-line px-2 py-1 text-left font-semibold text-base-content">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border border-line px-2 py-1">{children}</td>,
  del: ({ children }) => <del className="text-base-content/60">{children}</del>,
  hr: () => <hr className="my-4 border-base-300" />
}

export function MarkdownPreview({ markdown }: { markdown: string }): JSX.Element {
  return (
    <section aria-label="Preview" className="min-w-0 flex-1">
      <article className="mx-auto max-w-[560px] p-8 select-text">
        <ReactMarkdown remarkPlugins={PLUGINS} components={COMPONENTS}>
          {markdown}
        </ReactMarkdown>
      </article>
    </section>
  )
}
