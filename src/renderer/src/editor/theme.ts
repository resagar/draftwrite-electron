import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { markdownMarkerTags } from './markdown-markers'

const base = EditorView.theme(
  {
    '&': { backgroundColor: 'transparent', color: 'var(--editor-foreground)', height: '100%' },
    '.cm-scroller': {
      fontFamily: 'var(--editor-font, var(--font-mono))',
      lineHeight: 'var(--editor-line-height, 2)'
    },
    '.cm-content': {
      padding: '16px 20px',
      fontSize: 'var(--editor-size, 16px)',
      lineHeight: 'var(--editor-line-height, 2)',
      caretColor: 'var(--editor-cursor)',
      // The editor uses a wider measure than the preview at 16 px. The gutter
      // takes the left auto margin so the numbers and the text move together:
      // centring only the content left the line numbers far to the left.
      maxWidth: '849px',
      marginLeft: '0',
      marginRight: 'auto'
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      border: 'none',
      color: 'var(--color-gutter)',
      fontSize: 'var(--editor-size, 16px)',
      lineHeight: 'var(--editor-line-height, 2)',
      marginLeft: 'auto',
      opacity: '0.6'
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--editor-active-line)'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--color-gutter)',
      opacity: '1'
    },
    '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground':
      {
        backgroundColor: 'var(--editor-selection)'
      },
    '.cm-cursor': { borderLeftColor: 'var(--editor-cursor)', borderLeftWidth: '2px' },
    '&.cm-focused': { outline: 'none' },
    '&.cm-editor .cm-line': { paddingLeft: '0' }
  },
  { dark: true }
)

const highlight = HighlightStyle.define([
  // Structural tags are inherited; inline elements must take precedence.
  { tag: tags.quote, color: 'var(--md-quote)' },
  { tag: tags.list, color: 'var(--md-list)' },
  { tag: tags.heading, color: 'var(--md-heading)', fontWeight: '600' },
  { tag: tags.strong, color: 'var(--md-strong)', fontWeight: '600' },
  { tag: tags.emphasis, color: 'var(--md-emphasis)', fontStyle: 'italic' },
  { tag: tags.link, color: 'var(--md-link)', textDecoration: 'underline' },
  { tag: tags.monospace, color: 'var(--md-code)' },
  { tag: tags.contentSeparator, color: 'var(--md-mark)' },
  { tag: tags.processingInstruction, color: 'var(--md-mark)' },
  { tag: markdownMarkerTags.heading, color: 'var(--md-heading-mark)' },
  { tag: markdownMarkerTags.list, color: 'var(--md-list-mark)' },
  { tag: markdownMarkerTags.emphasis, color: 'var(--md-emphasis-mark)' },
  { tag: markdownMarkerTags.code, color: 'var(--md-code-mark)' },
  { tag: markdownMarkerTags.link, color: 'var(--md-link-mark)' },
  { tag: markdownMarkerTags.quote, color: 'var(--md-quote-mark)' }
])

export const draftwriteTheme = [base, syntaxHighlighting(highlight)]
