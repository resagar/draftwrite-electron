import { useState, type JSX, type ReactNode } from 'react'
import type { EditorialWorkspace, Writing } from '../../../../shared/editorial'
import { textChanges } from '../../../../shared/editorial-diff'

function value(content: Writing, field: string): string {
  return String((content as unknown as Record<string, string>)[field] ?? '')
}
function diff(before: string, after: string, side: 'before' | 'after'): ReactNode[] {
  const changes = textChanges(before, after)
  const nodes: ReactNode[] = []
  let cursor = 0
  changes.forEach((change, index) => {
    nodes.push(before.slice(cursor, change.from))
    if (side === 'before' && change.to > change.from)
      nodes.push(<del key={index}>{before.slice(change.from, change.to)}</del>)
    if (side === 'after' && change.text) nodes.push(<ins key={index}>{change.text}</ins>)
    cursor = change.to
  })
  nodes.push(before.slice(cursor))
  return nodes
}
export function EditorialComparison({
  workspace,
  variantId
}: {
  workspace: EditorialWorkspace
  variantId: string
}): JSX.Element {
  const [left, setLeft] = useState(workspace.versions.at(-1)?.id ?? 'draft:' + variantId)
  const [right, setRight] = useState('draft:' + variantId)
  const content = (id: string): Writing =>
    id.startsWith('draft:')
      ? workspace.variants.find((v) => 'draft:' + v.id === id)!.content
      : workspace.versions.find((v) => v.id === id)!.content
  const options = (
    <>
      <optgroup label="Drafts">
        {workspace.variants.map((v) => (
          <option key={v.id} value={'draft:' + v.id}>
            {v.name} · current draft
          </option>
        ))}
      </optgroup>
      <optgroup label="Saved versions">
        {workspace.versions.map((v) => (
          <option key={v.id} value={v.id}>
            {workspace.variants.find((item) => item.id === v.variantId)?.name ??
              v.variantName ??
              'Origin'}{' '}
            · {v.number} · {v.description}
          </option>
        ))}
      </optgroup>
    </>
  )
  const before = content(left)
  const after = content(right)
  const fields =
    before.kind === 'article' ? ['title', 'subtitle', 'target', 'text'] : ['topic', 'text']
  return (
    <section className="editorial-comparison" aria-label="Editorial comparison">
      <div className="editorial-comparison-selectors">
        <label>
          Compare from
          <select value={left} onChange={(e) => setLeft(e.target.value)}>
            {options}
          </select>
        </label>
        <label>
          Compare to
          <select value={right} onChange={(e) => setRight(e.target.value)}>
            {options}
          </select>
        </label>
      </div>
      <p>Removed text is struck through; added text is underlined.</p>
      {fields.map((field) => (
        <section key={field} aria-label={`${field} differences`}>
          <h3>{field === 'text' ? 'Text' : field[0].toUpperCase() + field.slice(1)}</h3>
          <div className="editorial-diff-columns">
            <pre>{diff(value(before, field), value(after, field), 'before')}</pre>
            <pre>{diff(value(before, field), value(after, field), 'after')}</pre>
          </div>
        </section>
      ))}
    </section>
  )
}
