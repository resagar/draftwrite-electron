import { X } from 'lucide-react'
import { useState, type JSX, type KeyboardEvent } from 'react'
import { TagChip } from '../../ui/TagChip/TagChip'

type TagInputProps = {
  tags: string[]
  onChange: (tags: string[]) => void
}

export function TagInput({ tags, onChange }: TagInputProps): JSX.Element {
  const [draft, setDraft] = useState('')

  const addTag = (): void => {
    const value = draft.trim()
    setDraft('')

    if (value === '' || tags.includes(value)) {
      return
    }

    onChange([...tags, value])
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag()
    }
  }

  return (
    <div className="space-y-1.5">
      {tags.length > 0 ? (
        <ul className="flex flex-wrap items-center gap-1">
          {tags.map((tag) => (
            <li key={tag} className="flex min-w-0 max-w-full items-center gap-1">
              <TagChip tag={tag} />
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                onClick={() => onChange(tags.filter((current) => current !== tag))}
                className="text-base-content/60 transition hover:text-error"
              >
                <X aria-hidden="true" className="h-2.5 w-2.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        type="text"
        value={draft}
        aria-label="Add a tag"
        placeholder="Add a tag and press Enter"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        className="h-7 w-full rounded border border-line bg-base-200 px-2 text-xs text-base-content placeholder:text-base-content/60 focus-visible:border-primary"
      />
    </div>
  )
}
