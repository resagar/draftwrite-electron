import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { afterEach, describe, expect, it } from '@jest/globals'
import {
  computeTypewriterPadding,
  typewriter,
  typewriterPaddingStyle,
  typewriterScroll
} from './typewriter'
import { articleEditorExtensions } from './extensions'

function createState(): EditorState {
  return EditorState.create({ doc: 'one\ntwo', extensions: [typewriterScroll] })
}

function scrollTargets(tr: { effects: readonly { value: unknown }[] }): string[] {
  return tr.effects.map((effect) => (effect.value as { y: string }).y)
}

describe('typewriterScroll', () => {
  it('centers the caret when the transaction already asks to scroll', () => {
    const tr = createState().update({
      changes: { from: 3, insert: '!' },
      selection: { anchor: 4 },
      scrollIntoView: true
    })

    const last = tr.effects[tr.effects.length - 1]

    expect(scrollTargets(tr)).toEqual(['center'])
    expect(last.value).toMatchObject({ y: 'center', range: { head: 4 } })
  })

  it('adds nothing when the transaction does not ask to scroll', () => {
    const tr = createState().update({ selection: { anchor: 2 } })

    expect(tr.effects).toHaveLength(0)
  })

  it('keeps a native scroll target untouched, as PageUp and PageDown do', () => {
    const tr = createState().update({
      selection: { anchor: 6 },
      effects: EditorView.scrollIntoView(6, { y: 'start' })
    })

    expect(scrollTargets(tr)).toEqual(['start'])
  })

  it('appends the center effect after an explicit target', () => {
    const tr = createState().update({
      selection: { anchor: 6 },
      effects: EditorView.scrollIntoView(6, { y: 'start' }),
      scrollIntoView: true
    })

    expect(scrollTargets(tr)).toEqual(['start', 'center'])
  })

  it('centers the active end of a non-empty selection', () => {
    const tr = createState().update({
      selection: { anchor: 0, head: 6 },
      scrollIntoView: true
    })

    expect(tr.effects[0].value).toMatchObject({ y: 'center', range: { head: 6 } })
  })

  it('leaves the document and the selection alone', () => {
    const state = createState()
    const tr = state.update({ selection: { anchor: 2 }, scrollIntoView: true })

    expect(tr.docChanged).toBe(false)
    expect(tr.newSelection.eq(state.selection)).toBe(false)
    expect(tr.state.doc.toString()).toBe('one\ntwo')
  })
})

describe('computeTypewriterPadding', () => {
  it('anchors the first line nine lines above the middle and leaves room to bring the last one to the top', () => {
    expect(computeTypewriterPadding(700, 24)).toEqual({ top: 122, bottom: 676 })
    expect(computeTypewriterPadding(600, 24)).toEqual({ top: 72, bottom: 576 })
  })

  it('clamps the anchor to the top when the offset needs more than half the viewport', () => {
    expect(computeTypewriterPadding(430, 24)).toEqual({ top: 0, bottom: 406 })
  })

  it('rounds the top and ceils the bottom so the padding stays in whole pixels', () => {
    expect(computeTypewriterPadding(430.5, 23.8)).toEqual({ top: 0, bottom: 407 })
  })

  it('drops the padding when the editor has no measurable height', () => {
    expect(computeTypewriterPadding(0, 24)).toEqual({ top: 0, bottom: 0 })
    expect(computeTypewriterPadding(-10, 24)).toEqual({ top: 0, bottom: 0 })
  })

  it('drops the padding when there is no line height to work with', () => {
    expect(computeTypewriterPadding(430, 0)).toEqual({ top: 0, bottom: 0 })
  })

  it('drops the padding when the editor is not taller than a single line', () => {
    expect(computeTypewriterPadding(24, 24)).toEqual({ top: 0, bottom: 0 })
    expect(computeTypewriterPadding(20, 24)).toEqual({ top: 0, bottom: 0 })
  })
})

describe('typewriterPaddingStyle', () => {
  it('declares only the vertical padding, so the horizontal one stays with the theme', () => {
    expect(typewriterPaddingStyle(700, 24)).toBe('padding-top: 122px; padding-bottom: 676px')
  })

  it('declares an explicit 0/0 when the editor has no measurable height', () => {
    // Hidden in `preview` mode: the theme's 16 px must not leak back in.
    expect(typewriterPaddingStyle(0, 24)).toBe('padding-top: 0px; padding-bottom: 0px')
    expect(typewriterPaddingStyle(-10, 24)).toBe('padding-top: 0px; padding-bottom: 0px')
  })

  it('declares an explicit 0/0 when the editor is not taller than one line', () => {
    expect(typewriterPaddingStyle(24, 24)).toBe('padding-top: 0px; padding-bottom: 0px')
    expect(typewriterPaddingStyle(20, 24)).toBe('padding-top: 0px; padding-bottom: 0px')
  })
})

/**
 * jsdom lays nothing out, so these tests assert the contract of the plugin — the
 * style it writes on `.cm-content`, computed from the geometry it reads — and
 * never a measured position. The numbers themselves are covered by
 * `computeTypewriterPadding`; the real centering belongs to the headless harness
 * and to the manual check in Electron.
 */
function mountEditor(doc = 'one\ntwo'): EditorView {
  const parent = document.createElement('div')
  document.body.appendChild(parent)

  const view = new EditorView({
    state: EditorState.create({ doc, extensions: typewriter }),
    parent
  })

  return view
}

const mounted: EditorView[] = []

afterEach(() => {
  for (const view of mounted.splice(0)) view.destroy()
})

describe('typewriter', () => {
  it('writes the style the padding formula computes for the live geometry', () => {
    const view = mountEditor()
    mounted.push(view)

    view.dispatch({ changes: { from: 0, insert: 'x' } })

    expect(view.contentDOM.style.cssText).toContain(
      typewriterPaddingStyle(view.scrollDOM.clientHeight, view.defaultLineHeight)
    )
  })

  it('always replaces the vertical padding of the theme', () => {
    const view = mountEditor()
    mounted.push(view)

    view.dispatch({ changes: { from: 0, insert: 'x' } })

    // jsdom has no layout, which is exactly the hidden editor case: the plugin
    // still declares 0/0 instead of leaving the theme's own padding.
    expect(view.contentDOM.style.paddingTop).toBe('0px')
    expect(view.contentDOM.style.paddingBottom).toBe('0px')
  })

  it('keeps the horizontal padding for the theme', () => {
    const view = mountEditor()
    mounted.push(view)

    view.dispatch({ changes: { from: 0, insert: 'x' } })

    expect(view.contentDOM.style.paddingLeft).toBe('')
    expect(view.contentDOM.style.paddingRight).toBe('')
  })
})

describe('articleEditorExtensions', () => {
  it('carries the typewriter into Story and Article', () => {
    const state = EditorState.create({ doc: 'one\ntwo', extensions: articleEditorExtensions })
    const tr = state.update({ selection: { anchor: 4 }, scrollIntoView: true })

    expect(scrollTargets(tr)).toContain('center')
  })
})
