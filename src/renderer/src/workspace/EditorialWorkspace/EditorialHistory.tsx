import type { JSX } from 'react'
import type { EditorialWorkspace } from '../../../../shared/editorial'

export function EditorialHistory({
  workspace,
  canRecover,
  onRecover,
  onBranch,
  onOpenPiece
}: {
  workspace: EditorialWorkspace
  canRecover: boolean
  onRecover: (versionId: string) => void
  onBranch: (versionId: string) => void
  onOpenPiece: (pieceId: string) => void
}): JSX.Element {
  return (
    <aside className="editorial-history" aria-label="Editorial history">
      <h2>Versions</h2>
      {!workspace.versions.length ? (
        <p>No saved versions. Your draft starts at 0.0.0.</p>
      ) : (
        [...workspace.versions].reverse().map((version) => (
          <article key={version.id}>
            <strong>
              {workspace.variants.find((v) => v.id === version.variantId)?.name ??
                version.variantName ??
                'Origin'}{' '}
              · {version.number}
            </strong>
            <p>{version.description}</p>
            <small>{new Date(version.createdAt).toLocaleString()}</small>
            <details>
              <summary>Read version</summary>
              {version.content.kind === 'article' ? (
                <>
                  <h3>{version.content.title}</h3>
                  <p>{version.content.subtitle}</p>
                  <p>{version.content.target}</p>
                </>
              ) : (
                <h3>{version.content.topic}</h3>
              )}
              <pre>{version.content.text}</pre>
              <p>{version.notes.length} review notes</p>
              {version.notes.map((note) => (
                <p key={note.id}>
                  {note.resolved ? 'Resolved: ' : 'Pending: '}
                  {note.text}
                </p>
              ))}
            </details>
            <div className="editorial-form-actions">
              <button type="button" disabled={!canRecover} onClick={() => onRecover(version.id)}>
                Recover content
              </button>
              <button type="button" onClick={() => onBranch(version.id)}>
                Branch here
              </button>
            </div>
          </article>
        ))
      )}
      <h2>Publications</h2>
      {!workspace.publications.length ? (
        <p>No publications recorded.</p>
      ) : (
        workspace.publications.map((record) => {
          const version = workspace.versions.find((v) => v.id === record.versionId)!
          return (
            <article key={record.id}>
              <strong>
                {workspace.variants.find((v) => v.id === version.variantId)?.name ??
                  version.variantName ??
                  'Origin'}{' '}
                · {version.number}
              </strong>
              <p>{record.date}</p>
              {record.url ? <p className="editorial-publication-url">{record.url}</p> : null}
            </article>
          )
        })
      )}
      {workspace.origin ? (
        <button type="button" onClick={() => onOpenPiece(workspace.origin!.pieceId)}>
          Open original {workspace.kind}
        </button>
      ) : null}
      {workspace.conversions.map((link) => (
        <button type="button" key={link.pieceId} onClick={() => onOpenPiece(link.pieceId)}>
          Open independent {workspace.kind}
        </button>
      ))}
    </aside>
  )
}
