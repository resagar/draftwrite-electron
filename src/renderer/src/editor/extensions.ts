import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'

export const articleEditorExtensions = [
  markdown({ base: markdownLanguage }),
  EditorView.lineWrapping,
  EditorView.contentAttributes.of({ 'aria-label': 'Article text' })
]
