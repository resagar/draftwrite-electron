import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { scrollPastEndSpace } from './scroll-past-end'
import { markdownMarkerStyles } from './markdown-markers'

export const articleEditorExtensions = [
  markdown({ base: markdownLanguage, extensions: markdownMarkerStyles }),
  EditorView.lineWrapping,
  EditorView.contentAttributes.of({ 'aria-label': 'Article text' }),
  ...scrollPastEndSpace
]
