import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

// Development only: the React Fast Refresh preamble is an inline module and
// the strict CSP would block it. Production keeps `script-src 'self'`.
function allowInlineDevScripts(): Plugin {
  return {
    name: 'draftwrite:allow-inline-dev-scripts',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
    }
  }
}

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: resolve('src/main/main.ts')
      }
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss(), allowInlineDevScripts()]
  }
})
