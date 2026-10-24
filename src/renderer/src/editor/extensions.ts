import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { typewriter } from './typewriter'

export const articleEditorExtensions = [
  markdown({ base: markdownLanguage }),
  EditorView.lineWrapping,
  EditorView.contentAttributes.of({ 'aria-label': 'Article text' }),
  ...typewriter
]
