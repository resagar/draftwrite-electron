import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { scrollPastEndSpace } from './scroll-past-end'

export const articleEditorExtensions = [
  markdown({ base: markdownLanguage }),
  EditorView.lineWrapping,
  EditorView.contentAttributes.of({ 'aria-label': 'Article text' }),
  ...scrollPastEndSpace
]
