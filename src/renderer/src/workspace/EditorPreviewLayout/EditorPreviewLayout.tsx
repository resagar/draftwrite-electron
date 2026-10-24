import { useRef, type JSX, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { useWorkspace } from '../../state/workspace-context'
import { Resizer } from '../../ui/Resizer/Resizer'
import { useSplitResizer } from '../../ui/Resizer/use-resizer'
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
  const containerRef = useRef<HTMLDivElement>(null)
  const showsEditor = viewMode !== 'preview'
  const showsPreview = viewMode !== 'edit'
  const split = showsEditor && showsPreview
  const { ratio, canResize, resizerProps } = useSplitResizer({
    storageKey: 'editorSplit',
    containerRef,
    defaultRatio: 0.5,
    minRatio: 0.2,
    maxRatio: 0.8,
    minPanePx: 160,
    label: 'Resize editor and preview'
  })
  const resizable = split && canResize

  return (
    <>
      {showsEditor ? toolbar : null}

      <div ref={containerRef} className="flex min-h-0 flex-1">
        <div
          style={
            resizable ? { flexBasis: `${ratio * 100}%`, flexGrow: 0, flexShrink: 0 } : undefined
          }
          className={cn(
            'min-h-0 min-w-0',
            showsEditor ? (resizable ? '' : 'flex-1') : 'hidden',
            split ? 'border-r border-base-300' : ''
          )}
        >
          {editor}
        </div>

        {resizable ? <Resizer {...resizerProps} /> : null}

        {/* The preview is the flex child and owns its scroll; wrapping it in
            another scroller would split the viewport the sync measures. */}
        {showsPreview ? <MarkdownPreview markdown={markdown} /> : null}
      </div>
    </>
  )
}
