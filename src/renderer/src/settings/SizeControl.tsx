import { useState, type JSX } from 'react'
import { sizeBounds, type TypographyContext } from './preferences'

export function SizeControl({
  context,
  title,
  size,
  onChange
}: {
  context: TypographyContext
  title: string
  size: number
  onChange: (size: number) => void
}): JSX.Element {
  const [input, setInput] = useState(String(size))
  const [previousSize, setPreviousSize] = useState(size)
  if (previousSize !== size) {
    setPreviousSize(size)
    setInput(String(size))
  }
  const { min, max } = sizeBounds(context)
  const valid =
    input.trim() !== '' &&
    Number.isFinite(Number(input)) &&
    Number(input) >= min &&
    Number(input) <= max
  const label = context === 'interface' ? 'Interface scale (%)' : `${title} font size (px)`
  return (
    <>
      <label htmlFor={`${context}-size`}>{label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="settings-button"
          aria-label={`Decrease ${title.toLowerCase()} size`}
          disabled={size <= min}
          onClick={() => onChange(Math.max(min, size - 1))}
        >
          −
        </button>
        <input
          id={`${context}-size`}
          className="settings-input min-w-0 w-full"
          type="number"
          min={min}
          max={max}
          step="any"
          value={input}
          aria-invalid={!valid || undefined}
          onChange={(event) => {
            const raw = event.target.value
            setInput(raw)
            const number = event.target.valueAsNumber
            if (Number.isFinite(number) && number >= min && number <= max) onChange(number)
          }}
          onBlur={() => setInput(String(size))}
        />
        <button
          type="button"
          className="settings-button"
          aria-label={`Increase ${title.toLowerCase()} size`}
          disabled={size >= max}
          onClick={() => onChange(Math.min(max, size + 1))}
        >
          +
        </button>
      </div>
      <p className="text-xs text-base-content/75">
        {min}–{max}
        {context === 'interface' ? '%' : ' px'}
      </p>
    </>
  )
}
