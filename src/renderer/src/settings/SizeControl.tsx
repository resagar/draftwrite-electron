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
  const { min, max } = sizeBounds(context)
  return (
    <NumberControl
      id={`${context}-size`}
      label={context === 'interface' ? 'Interface scale (%)' : `${title} font size (px)`}
      actionLabel={`${title.toLowerCase()} size`}
      value={size}
      min={min}
      max={max}
      unit={context === 'interface' ? '%' : ' px'}
      onChange={onChange}
    />
  )
}

export function NumberControl({
  id,
  label,
  actionLabel,
  value: size,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}: {
  id: string
  label: string
  actionLabel: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}): JSX.Element {
  const [input, setInput] = useState(String(size))
  const [previousSize, setPreviousSize] = useState(size)
  if (previousSize !== size) {
    setPreviousSize(size)
    setInput(String(size))
  }
  const valid =
    input.trim() !== '' &&
    Number.isFinite(Number(input)) &&
    Number(input) >= min &&
    Number(input) <= max
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="settings-button"
          aria-label={`Decrease ${actionLabel}`}
          disabled={size <= min}
          onClick={() => onChange(Math.max(min, Number((size - step).toFixed(10))))}
        >
          −
        </button>
        <input
          id={id}
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
          aria-label={`Increase ${actionLabel}`}
          disabled={size >= max}
          onClick={() => onChange(Math.min(max, Number((size + step).toFixed(10))))}
        >
          +
        </button>
      </div>
      <p className="text-xs text-base-content/75">
        {min}–{max}
        {unit}
      </p>
    </>
  )
}
