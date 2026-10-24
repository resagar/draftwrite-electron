import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

const base = EditorView.theme(
  {
    '&': { backgroundColor: 'transparent', color: 'var(--color-base-content)', height: '100%' },
    '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '2' },
    '.cm-content': {
      padding: '16px 20px',
      fontSize: '16px',
      lineHeight: '2',
      caretColor: 'var(--color-primary)',
      // The editor uses a wider measure than the preview at 16 px. The gutter
      // takes the left auto margin so the numbers and the text move together:
      // centring only the content left the line numbers far to the left.
      maxWidth: '816px',
      marginLeft: '0',
      marginRight: 'auto'
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      border: 'none',
      color: 'var(--color-gutter)',
      fontSize: '16px',
      lineHeight: '2',
      marginLeft: 'auto',
      opacity: '0.6'
    },
    '.cm-activeLine': {
      backgroundColor: 'color-mix(in oklab, var(--color-neutral) 35%, transparent)'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--color-gutter)',
      opacity: '1'
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'color-mix(in oklab, var(--color-secondary) 28%, transparent)'
    },
    '.cm-cursor': { borderLeftColor: 'var(--color-primary)', borderLeftWidth: '2px' },
    '&.cm-focused': { outline: 'none' },
    '&.cm-editor .cm-line': { paddingLeft: '0' }
  },
  { dark: true }
)

const highlight = HighlightStyle.define([
  { tag: tags.heading, color: 'var(--color-secondary)', fontWeight: '600' },
  { tag: tags.strong, color: 'var(--color-accent)', fontWeight: '600' },
  { tag: tags.emphasis, color: 'var(--color-warning)', fontStyle: 'italic' },
  { tag: tags.link, color: 'var(--color-info)', textDecoration: 'underline' },
  { tag: tags.monospace, color: 'var(--color-success)' },
  { tag: tags.list, color: 'var(--color-primary)' },
  { tag: tags.contentSeparator, color: 'var(--color-gutter)' },
  {
    tag: tags.processingInstruction,
    color: 'color-mix(in oklab, var(--color-base-content) 40%, transparent)'
  }
])

export const draftwriteTheme = [base, syntaxHighlighting(highlight)]
