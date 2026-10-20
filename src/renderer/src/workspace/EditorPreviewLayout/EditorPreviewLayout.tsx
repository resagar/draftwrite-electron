import type { JSX, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { useWorkspace } from '../../state/workspace-context'
import { MarkdownPreview } from '../MarkdownPreview/MarkdownPreview'

type EditorPreviewLayoutProps = {
  toolbar: ReactNode
  editor: ReactNode
  markdown: string
}

export function EditorPreviewLayout({
  toolbar,
  editor,
  markdown
}: EditorPreviewLayoutProps): JSX.Element {
  const { viewMode } = useWorkspace()
  const showsEditor = viewMode !== 'preview'
  const showsPreview = viewMode !== 'edit'

  return (
    <>
      {showsEditor ? toolbar : null}

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            'min-h-0 min-w-0',
            showsEditor ? 'flex-1' : 'hidden',
            showsEditor && showsPreview ? 'border-r border-base-300' : ''
          )}
        >
          {editor}
        </div>

        {showsPreview ? (
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <MarkdownPreview markdown={markdown} />
          </div>
        ) : null}
      </div>
    </>
  )
}
