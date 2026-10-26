import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { describe, expect, it } from '@jest/globals'
import { articleEditorExtensions } from './extensions'
import { bottomScrollPadding } from './scroll-past-end'

describe('bottomScrollPadding', () => {
  it('leaves the last line room to reach the top', () => {
    expect(bottomScrollPadding(700, 24)).toBe('padding-bottom: 676px')
  })

  it('declares only the bottom side, so the top padding stays with the theme', () => {
    expect(bottomScrollPadding(700, 24)).not.toContain('padding-top')
  })

  it('is zero without a viewport or when it is no taller than a line', () => {
    expect(bottomScrollPadding(0, 24)).toBe('padding-bottom: 0px')
    expect(bottomScrollPadding(-10, 24)).toBe('padding-bottom: 0px')
    expect(bottomScrollPadding(24, 24)).toBe('padding-bottom: 0px')
    expect(bottomScrollPadding(20, 24)).toBe('padding-bottom: 0px')
    expect(bottomScrollPadding(700, 0)).toBe('padding-bottom: 0px')
  })
})

describe('articleEditorExtensions', () => {
  it('applies the bottom padding to the shared editor', () => {
    const parent = document.createElement('div')
    document.body.appendChild(parent)

    const view = new EditorView({
      state: EditorState.create({ doc: 'one\ntwo', extensions: articleEditorExtensions }),
      parent
    })

    // jsdom has no layout: `clientHeight` is 0, so the padding clamps to zero
    // but the attribute is still owned by the extension.
    expect(view.contentDOM.style.paddingBottom).toBe('0px')

    view.destroy()
    parent.remove()
  })
})
