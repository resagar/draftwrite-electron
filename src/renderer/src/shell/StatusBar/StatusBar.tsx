import { AlertTriangle, Check } from 'lucide-react'
import type { JSX } from 'react'
import { useEditorStatus, type SaveStatus } from '../../state/status-store'
import { usePlatformModifier } from '../../state/use-platform'
import { Kbd } from '../../ui/Kbd/Kbd'

const SAVE_LABELS: Record<SaveStatus, string> = {
  idle: '',
  pending: 'Unsaved',
  saving: 'Saving',
  saved: 'Saved',
  error: 'Not saved',
  incomplete: 'Not saved yet'
}

export function StatusBar(): JSX.Element {
  const { save, words, characters, readingMinutes, cursor, vimMode } = useEditorStatus()
  const modifier = usePlatformModifier()
  const label = SAVE_LABELS[save]
  const showingDocument = save !== 'idle'

  return (
    <footer className="z-30 flex h-6 min-h-6 items-center justify-between gap-3 border-t border-base-300 bg-base-300 px-3 font-mono text-xs text-base-content/70 select-none">
      <div className="flex min-w-0 items-center gap-3">
        <span role="status" aria-live="polite" className="flex shrink-0 items-center gap-1.5">
          {label === '' ? null : (
            <>
              {save === 'error' ? (
                <AlertTriangle aria-hidden="true" className="h-3 w-3 text-error" />
              ) : (
                <Check aria-hidden="true" className="h-3 w-3 text-success" />
              )}
              <span className="text-base-content/85">{label}</span>
            </>
          )}
        </span>

        {showingDocument ? (
          <>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="sr-only">Force save</span>
              <Kbd>{`${modifier} S`}</Kbd>
            </span>
            <span aria-hidden="true" className="text-base-content/40">
              ·
            </span>
            <span className="shrink-0">
              <span className="text-base-content/60">Words: </span>
              <span className="text-base-content/85">{words}</span>
            </span>
            <span className="shrink-0">
              <span className="text-base-content/60">Chars: </span>
              <span className="text-base-content/85">{characters}</span>
            </span>
            <span className="shrink-0">
              <span className="text-base-content/60">Reading: </span>
              <span className="text-base-content/85">{readingMinutes} min</span>
            </span>
          </>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {vimMode !== null && (
          <span role="status" aria-label={`Vim mode: ${vimMode}`} className="text-base-content/85">
            {vimMode}
          </span>
        )}
        {cursor === null ? null : (
          <>
            <span className="text-base-content/60">
              Ln <span className="text-base-content/85">{cursor.line}</span>, Col{' '}
              <span className="text-base-content/85">{cursor.column}</span>
            </span>
            <span aria-hidden="true" className="text-base-content/40">
              ·
            </span>
          </>
        )}
        <span>Markdown</span>
        <span aria-hidden="true" className="text-base-content/60">
          ·
        </span>
        <span>UTF-8</span>
        <span aria-hidden="true" className="text-base-content/60">
          ·
        </span>
        <span>LF</span>
      </div>
    </footer>
  )
}
