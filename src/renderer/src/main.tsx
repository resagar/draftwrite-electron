import '@fontsource/inter/latin-300.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/fira-code/latin-400.css'
import '@fontsource/fira-code/latin-500.css'
import '@fontsource/fira-code/latin-600.css'
import '@fontsource/newsreader/latin-400.css'
import '@fontsource/newsreader/latin-400-italic.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { createIpcPort } from './data/ipc-port'
import { DataPortProvider } from './data/port-context'
import './global.css'

const container = document.getElementById('root')
if (container === null) {
  throw new Error('root element not found')
}

createRoot(container).render(
  <StrictMode>
    <DataPortProvider port={createIpcPort()}>
      <App />
    </DataPortProvider>
  </StrictMode>
)
