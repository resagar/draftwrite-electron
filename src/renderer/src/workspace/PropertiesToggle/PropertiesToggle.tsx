import { ChevronDown } from 'lucide-react'
import type { JSX } from 'react'
import { cn } from '../../lib/cn'

type PropertiesToggleProps = {
  label: string
  summary: string
  expanded: boolean
  controls: string
  onToggle: () => void
}

export function PropertiesToggle({
  label,
  summary,
  expanded,
  controls,
  onToggle
}: PropertiesToggleProps): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-describedby={`${controls}-summary`}
      title={`${label}: ${summary}`}
      onClick={(event) => {
        if (expanded) event.currentTarget.focus()
        onToggle()
      }}
      className="inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded border border-line px-2 text-xs text-base-content/80 transition hover:bg-neutral/40"
    >
      <ChevronDown
        aria-hidden="true"
        className={cn('h-3 w-3 shrink-0', expanded ? 'rotate-180' : '')}
      />
      <span className="min-w-0 truncate">Properties</span>
      <span
        id={`${controls}-summary`}
        title={summary}
        className="max-w-24 shrink-[999] truncate text-2xs text-base-content/60"
      >
        {summary}
      </span>
    </button>
  )
}
