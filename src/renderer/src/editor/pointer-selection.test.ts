import { EditorState } from '@codemirror/state'
import { EditorView, type ViewUpdate } from '@codemirror/view'
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import { articleEditorExtensions } from './extensions'
import { isPointerGestureEnd, pointerGesture, pointerSelectionEnd } from './pointer-selection'

type Frame = { id: number; callback: FrameRequestCallback }

/**
 * jsdom has no frame clock we can wait on deterministically, so `rAF` is
 * replaced by a queue the test flushes by hand. The plugin resolves it through
 * `contentDOM.ownerDocument.defaultView`, which is this same `window`.
 */
let frames: Frame[] = []
let nextFrameId = 0

function flushFrames(): void {
  const pending = frames
  frames = []
  for (const frame of pending) frame.callback(0)
}

function dispatch(target: EventTarget, event: Event): void {
  target.dispatchEvent(event)
}

function mouseDown(target: EventTarget, button = 0): void {
  dispatch(target, new MouseEvent('mousedown', { bubbles: true, cancelable: true, button }))
}

function mouseMove(target: EventTarget, buttons = 1): void {
  dispatch(target, new MouseEvent('mousemove', { bubbles: true, cancelable: true, buttons }))
}

function mouseUp(target: EventTarget): void {
  dispatch(target, new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0 }))
}

function touchEnd(target: EventTarget): void {
  // jsdom does not implement `TouchEvent`; the plugin only needs the name.
  dispatch(target, new Event('touchend', { bubbles: true }))
}

const mounted: EditorView[] = []

afterEach(() => {
  for (const view of mounted.splice(0)) view.destroy()
  frames = []
})

beforeEach(() => {
  frames = []
  nextFrameId = 0
  window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    const id = ++nextFrameId
    frames.push({ id, callback })

    return id
  }
  window.cancelAnimationFrame = (id: number): void => {
    frames = frames.filter((frame) => frame.id !== id)
  }
})

type Harness = {
  view: EditorView
  updates: ViewUpdate[]
  gestureEnds: () => ViewUpdate[]
}

function mountEditor(doc = 'one\ntwo\nthree'): Harness {
  const parent = document.createElement('div')
  document.body.appendChild(parent)

  const updates: ViewUpdate[] = []
  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [pointerGesture, EditorView.updateListener.of((update) => updates.push(update))]
    }),
    parent
  })
  mounted.push(view)

  return {
    view,
    updates,
    gestureEnds: () => updates.filter((update) => isPointerGestureEnd(update))
  }
}

function scrollTargets(update: ViewUpdate): { y: string; range?: { head: number } }[] {
  return update.transactions.flatMap((transaction) =>
    transaction.effects
      .map((effect) => effect.value as { y?: string; range?: { head: number } })
      .filter((value) => typeof value?.y === 'string')
      .map((value) => value as { y: string; range?: { head: number } })
  )
}

/** The single scroll effect the gesture-end transaction is expected to carry. */
function centerTarget(update: ViewUpdate): { y: string; range?: { head: number } } {
  const targets = scrollTargets(update)
  expect(targets).toHaveLength(1)

  return targets[0]
}

describe('isPointerGestureEnd', () => {
  it('recognises the transaction that closes a pointer gesture', () => {
    const state = EditorState.create({ doc: 'one' })
    const tr = state.update({ annotations: pointerSelectionEnd.of(1) })

    expect(isPointerGestureEnd({ transactions: [tr] })).toBe(true)
  })

  it('ignores a transaction without the annotation', () => {
    const state = EditorState.create({ doc: 'one' })
    const tr = state.update({ changes: { from: 0, insert: '!' } })

    expect(isPointerGestureEnd({ transactions: [tr] })).toBe(false)
  })

  it('finds the annotation when the update carries several transactions', () => {
    const state = EditorState.create({ doc: 'one' })
    const plain = state.update({ selection: { anchor: 1 } })
    const annotated = state.update({ annotations: pointerSelectionEnd.of(2) })

    expect(isPointerGestureEnd({ transactions: [plain] })).toBe(false)
    expect(isPointerGestureEnd({ transactions: [plain, annotated] })).toBe(true)
  })
})

describe('pointerGesture', () => {
  it('centers the settled caret once when a click ends', () => {
    const { view, updates, gestureEnds } = mountEditor()

    mouseDown(view.contentDOM)
    mouseUp(view.contentDOM.ownerDocument)

    // Nothing happens before the frame: the selection CodeMirror settles in the
    // document `mouseup` is not final yet when the listener runs.
    expect(gestureEnds()).toHaveLength(0)

    // A selection change between the release and the frame must still be read.
    view.dispatch({ selection: { anchor: 5 } })
    updates.length = 0

    flushFrames()

    expect(gestureEnds()).toHaveLength(1)
    expect(centerTarget(gestureEnds()[0])).toMatchObject({ y: 'center', range: { head: 5 } })
  })

  it('centers with the head the view already has when the frame runs', () => {
    const { view, gestureEnds } = mountEditor()
    view.dispatch({ selection: { anchor: 2 } })

    mouseDown(view.contentDOM)
    const head = view.state.selection.main.head
    mouseUp(view.contentDOM.ownerDocument)
    flushFrames()

    expect(gestureEnds()).toHaveLength(1)
    expect(centerTarget(gestureEnds()[0])).toMatchObject({ y: 'center', range: { head } })
  })

  it('does not center during a drag and centers once on release', () => {
    const { view, gestureEnds, updates } = mountEditor()
    const doc = view.contentDOM.ownerDocument

    mouseDown(view.contentDOM)
    for (const position of [2, 4, 6, 8]) {
      mouseMove(doc)
      view.dispatch({ selection: { anchor: position }, userEvent: 'select.pointer' })
    }

    flushFrames()
    expect(gestureEnds()).toHaveLength(0)

    mouseUp(doc)
    updates.length = 0
    flushFrames()

    expect(gestureEnds()).toHaveLength(1)
    expect(centerTarget(gestureEnds()[0])).toMatchObject({ y: 'center', range: { head: 8 } })
  })

  it('coalesces the release into a single frame', () => {
    const { view, gestureEnds } = mountEditor()
    const doc = view.contentDOM.ownerDocument

    mouseDown(view.contentDOM)
    mouseUp(doc)
    mouseUp(doc)
    mouseUp(doc)
    flushFrames()

    expect(gestureEnds()).toHaveLength(1)
  })

  it('ignores the right and the middle button', () => {
    const { view, gestureEnds } = mountEditor()
    const doc = view.contentDOM.ownerDocument

    for (const button of [1, 2]) {
      mouseDown(view.contentDOM, button)
      mouseUp(doc)
      flushFrames()
    }

    expect(gestureEnds()).toHaveLength(0)
  })

  it('ignores a release that does not close a press on the content', () => {
    const { view, gestureEnds } = mountEditor()

    mouseDown(document.body)
    mouseUp(view.contentDOM.ownerDocument)
    flushFrames()

    expect(gestureEnds()).toHaveLength(0)
  })

  it('derives a drag release outside the content from the document listener', () => {
    const { view, gestureEnds } = mountEditor()
    const doc = view.contentDOM.ownerDocument

    mouseDown(view.contentDOM)
    mouseMove(doc)
    mouseUp(doc.body)
    flushFrames()

    expect(gestureEnds()).toHaveLength(1)
  })

  it('does not repeat a touch gesture when the synthetic mouseup arrives', () => {
    const { view, gestureEnds } = mountEditor()
    const doc = view.contentDOM.ownerDocument

    // A tap ends as: touchstart, touchend, then the compatibility mouse events.
    mouseDown(view.contentDOM)
    touchEnd(view.contentDOM)
    flushFrames()
    expect(gestureEnds()).toHaveLength(1)

    mouseUp(doc)
    flushFrames()

    expect(gestureEnds()).toHaveLength(1)
  })

  it('drops the listeners and the pending frame when the editor dies', () => {
    const { view, updates } = mountEditor()
    const doc = view.contentDOM.ownerDocument

    mouseDown(view.contentDOM)
    mouseUp(doc)

    view.destroy()
    mounted.length = 0
    updates.length = 0

    flushFrames()
    expect(updates).toHaveLength(0)
    expect(frames).toHaveLength(0)

    mouseDown(view.contentDOM)
    mouseUp(doc)
    flushFrames()

    expect(updates).toHaveLength(0)
  })
})

describe('articleEditorExtensions', () => {
  it('carries the pointer gesture into Story and Article', () => {
    const parent = document.createElement('div')
    document.body.appendChild(parent)

    const updates: ViewUpdate[] = []
    const view = new EditorView({
      state: EditorState.create({
        doc: 'one\ntwo',
        extensions: [
          ...articleEditorExtensions,
          EditorView.updateListener.of((u) => updates.push(u))
        ]
      }),
      parent
    })
    mounted.push(view)

    mouseDown(view.contentDOM)
    mouseUp(view.contentDOM.ownerDocument)
    flushFrames()

    const ends = updates.filter((update) => isPointerGestureEnd(update))
    expect(ends).toHaveLength(1)
    expect(centerTarget(ends[0])).toMatchObject({ y: 'center' })
  })
})
