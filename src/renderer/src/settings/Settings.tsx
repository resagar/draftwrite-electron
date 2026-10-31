import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { availableFont } from './fonts'
import { defaultPreferences } from './preferences'
import { SizeControl } from './SizeControl'
import type { TypographyContext } from './preferences'
import { useTypography } from './typography-context'

type TypographyControlsProps = { context: TypographyContext; title: string; description: string }

const contexts: TypographyControlsProps[] = [
  { context: 'editor', title: 'Editor', description: 'The text you write.' },
  {
    context: 'preview',
    title: 'Preview',
    description: 'Your rendered Markdown. Code stays monospaced.'
  },
  {
    context: 'interface',
    title: 'Interface',
    description: 'Menus, controls and spacing. Reading sizes stay independent.'
  }
]

function TypographyControls({ context, title, description }: TypographyControlsProps): JSX.Element {
  const { preferences, catalog, loading, catalogError, update } = useTypography()
  const [search, setSearch] = useState('')
  const choice = preferences[context]
  const missing = availableFont(choice.font, catalog) === null
  const visible = catalog.filter(
    ({ family }) => family === choice.font || family.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <fieldset className="settings-context border-t border-line py-6">
      <legend className="float-left mb-1 w-full text-base font-semibold">{title}</legend>
      <p className="clear-both mb-4 text-sm text-base-content/75">{description}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${context}-search`}>Search {title.toLowerCase()} fonts</label>
          <input
            id={`${context}-search`}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="settings-input"
            placeholder="Search font families"
          />
          <label htmlFor={`${context}-font`}>{title} font</label>
          <select
            id={`${context}-font`}
            className="settings-input"
            value={availableFont(choice.font, catalog) ?? choice.font}
            onChange={(event) => update(context, { ...choice, font: event.target.value })}
          >
            {missing && (
              <option value={choice.font} disabled>
                {choice.font} (unavailable)
              </option>
            )}
            {(['Included', 'System'] as const).map((source) => (
              <optgroup key={source} label={source}>
                {visible
                  .filter((font) => font.source === source)
                  .map(({ family }) => (
                    <option key={family} value={family}>
                      {family}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          {visible.length === 0 && <p role="status">No matching fonts.</p>}
        </div>
        <div className="flex flex-col gap-2">
          <SizeControl
            context={context}
            title={title}
            size={choice.size}
            onChange={(size) => update(context, { ...choice, size })}
          />
          <button
            type="button"
            className="settings-button self-start"
            onClick={() => {
              setSearch('')
              update(context, { ...defaultPreferences[context] })
            }}
          >
            Restore {title.toLowerCase()} defaults
          </button>
        </div>
      </div>
      {missing && !loading && (
        <p role="status" className="mt-3 text-warning">
          {catalogError ? 'Cannot check' : 'Unavailable font:'} {choice.font}. Using{' '}
          {defaultPreferences[context].font} temporarily. Your choice is kept.
        </p>
      )}
    </fieldset>
  )
}

export function Settings(): JSX.Element {
  const { setSettingsOpen, storageError, catalogError, loading } = useTypography()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [])
  return (
    <section
      aria-label="Settings"
      className="settings-screen absolute inset-0 z-20 overflow-y-auto bg-base-100 p-6 sm:p-8"
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold">
              Typography
            </h1>
            <p className="mt-2 text-sm text-base-content/75">
              Changes apply immediately and are saved for all documents.
            </p>
          </div>
          <button
            type="button"
            className="settings-button shrink-0"
            onClick={() => setSettingsOpen(false)}
          >
            Back to writing
          </button>
        </div>
        {loading && (
          <p role="status" className="mb-4">
            Loading system fonts…
          </p>
        )}
        {catalogError && (
          <p role="alert" className="mb-4 text-warning">
            System fonts could not be loaded. Included fonts are available. Reopen Settings to try
            again.
          </p>
        )}
        {storageError && (
          <p role="alert" className="mb-4 text-error">
            Changes apply for this session but could not be saved. Free local storage and change a
            setting to retry.
          </p>
        )}
        {contexts.map((item) => (
          <TypographyControls key={item.context} {...item} />
        ))}
      </div>
    </section>
  )
}
