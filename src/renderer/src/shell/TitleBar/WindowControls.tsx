import { Copy, Minus, Square, X } from 'lucide-react'
import type { JSX } from 'react'
import type { WindowChrome } from './use-window-chrome'

export function WindowControls({ chrome }: { chrome: WindowChrome }): JSX.Element {
  const maximized = chrome.state?.maximized === true
  return (
    <div className="window-controls" aria-label="Window controls">
      <button
        type="button"
        aria-label="Minimize window"
        title="Minimize window"
        onClick={() => chrome.execute('minimize')}
      >
        <Minus aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={maximized ? 'Restore window' : 'Maximize window'}
        title={maximized ? 'Restore window' : 'Maximize window'}
        onClick={() => chrome.execute('toggle-maximize')}
      >
        {maximized ? <Copy aria-hidden="true" /> : <Square aria-hidden="true" />}
      </button>
      <button
        type="button"
        aria-label="Close window"
        title="Close window"
        className="window-controls-close"
        onClick={() => chrome.execute('close')}
      >
        <X aria-hidden="true" />
      </button>
    </div>
  )
}
