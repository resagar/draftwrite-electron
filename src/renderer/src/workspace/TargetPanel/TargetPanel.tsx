import { useEffect, useId, useRef, useState, type JSX, type KeyboardEvent } from 'react'
import type { ArticleTargetLink } from '../../state/article-target-context'

/** The domain caps the Target at 255 UTF-8 bytes, not at 255 characters. */
const TARGET_MAX_BYTES = 255

/**
 * UTF-8 byte length, matching the domain's `Buffer.byteLength`. `TextEncoder`
 * is not available in every test environment, and this keeps the check pure.
 */
function utf8Length(value: string): number {
  let bytes = 0

  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4
  }

  return bytes
}

type TargetPanelProps = {
  link: ArticleTargetLink
}

/**
 * Read-and-edit view of the Article target. It fills whatever height its
 * parent gives it: the header stays put and only the text scrolls.
 */
export function TargetPanel({ link }: TargetPanelProps): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(link.value)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef(false)
  const errorId = useId()
  const hasValue = link.value.trim() !== ''

  useEffect(() => {
    if (editing) {
      const textarea = textareaRef.current

      if (textarea !== null) {
        textarea.focus()
        textarea.setSelectionRange(textarea.value.length, textarea.value.length)
      }

      return
    }

    // The trigger only exists in read mode, so the focus has to wait for the
    // edit mode to be replaced.
    if (returnFocusRef.current) {
      returnFocusRef.current = false
      triggerRef.current?.focus()
    }
  }, [editing])

  const begin = (): void => {
    setDraft(link.value)
    setError(null)
    setEditing(true)
  }

  const cancel = (): void => {
    returnFocusRef.current = true
    setEditing(false)
    setError(null)
  }

  const save = (): void => {
    const next = draft.trim()

    if (utf8Length(next) > TARGET_MAX_BYTES) {
      setError('Target must be 255 bytes or fewer.')
      return
    }

    link.save(next)
    returnFocusRef.current = true
    setEditing(false)
    setError(null)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
      return
    }

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      save()
    }
  }

  return (
    <section aria-label="Target" className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex h-8 min-h-8 items-center justify-between gap-2 border-b border-base-300/60 px-4">
        <h2 className="font-mono text-2xs tracking-wider text-base-content/60 uppercase">Target</h2>

        <div className="flex shrink-0 items-center gap-1">
          {editing ? (
            <>
              <button
                type="button"
                onClick={cancel}
                className="rounded border border-line px-1.5 py-0.5 text-2xs text-base-content/80 transition hover:bg-neutral/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="rounded bg-primary px-1.5 py-0.5 text-2xs text-primary-content transition hover:bg-primary/90"
              >
                Save
              </button>
            </>
          ) : (
            <button
              ref={triggerRef}
              type="button"
              onClick={begin}
              className="rounded px-1.5 py-0.5 text-2xs text-secondary transition hover:bg-neutral/40"
            >
              {hasValue ? 'Edit target' : 'Add target'}
            </button>
          )}
        </div>
      </header>

      {editing ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <textarea
            ref={textareaRef}
            aria-label="Target"
            aria-invalid={error !== null}
            aria-describedby={error === null ? undefined : errorId}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              setError(null)
            }}
            onKeyDown={onKeyDown}
            className="min-h-0 w-full flex-1 resize-none overflow-y-auto overscroll-contain bg-transparent px-4 py-2 font-sans text-base leading-loose text-base-content focus:outline-none"
          />
          {error === null ? null : (
            <p id={errorId} role="alert" className="shrink-0 px-4 pb-2 text-2xs text-error">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2 select-text">
          {hasValue ? (
            <p className="font-sans text-base leading-loose whitespace-pre-wrap break-words text-base-content/80">
              {link.value}
            </p>
          ) : (
            <p className="font-sans text-base leading-loose text-base-content/50">No target yet.</p>
          )}
        </div>
      )}
    </section>
  )
}
