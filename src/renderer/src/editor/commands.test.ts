import { EditorState, type StateCommand } from '@codemirror/state'
import { describe, expect, it } from '@jest/globals'
import {
  insertLink,
  toggleBlockquote,
  toggleBold,
  toggleBulletList,
  toggleCodeBlock,
  toggleHeading,
  toggleInlineCode,
  toggleItalic,
  toggleTaskList
} from './commands'

function apply(command: StateCommand, doc: string, anchor: number, head = anchor): string {
  const state = EditorState.create({ doc, selection: { anchor, head } })
  let result = doc

  command({
    state,
    dispatch: (transaction) => {
      result = transaction.state.doc.toString()
    }
  })

  return result
}

describe('wrapOrUnwrap', () => {
  it('wraps the selection', () => {
    expect(apply(toggleBold, 'hello world', 0, 5)).toBe('**hello** world')
  })

  it('unwraps a selection that is already wrapped', () => {
    expect(apply(toggleBold, '**hello** world', 2, 7)).toBe('hello world')
  })

  it('wraps an empty selection with a placeholder', () => {
    expect(apply(toggleBold, 'hello', 5)).toBe('hello**bold text**')
  })

  it('leaves the rest of the document untouched', () => {
    expect(apply(toggleItalic, 'one\ntwo\nthree', 4, 7)).toBe('one\n*two*\nthree')
  })

  it('wraps inline code', () => {
    expect(apply(toggleInlineCode, 'read me', 0, 4)).toBe('`read` me')
  })

  it('refuses to run when there is nothing to wrap', () => {
    let dispatched = false

    toggleBold({
      state: EditorState.create({ doc: 'hello', selection: { anchor: 5 } }),
      dispatch: () => {
        dispatched = true
      }
    })

    expect(dispatched).toBe(true)
  })
})

describe('insertLink', () => {
  it('turns the selection into a link and selects the target', () => {
    expect(apply(insertLink, 'read the notes', 9, 14)).toBe('read the [notes](https://)')
  })

  it('creates an empty link when nothing is selected', () => {
    expect(apply(insertLink, 'see ', 4)).toBe('see [](https://)')
  })
})

describe('line prefixes', () => {
  it('prefixes every line the selection touches', () => {
    expect(apply(toggleHeading, 'one\ntwo', 0, 7)).toBe('## one\n## two')
  })

  it('removes the prefix when every line already has it', () => {
    expect(apply(toggleHeading, '## one\n## two', 0, 13)).toBe('one\ntwo')
  })

  it('prefixes a bullet list', () => {
    expect(apply(toggleBulletList, 'one\n', 0)).toBe('- one\n')
  })

  it('prefixes a task list', () => {
    expect(apply(toggleTaskList, 'one\n', 0)).toBe('- [ ] one\n')
  })

  it('prefixes a blockquote', () => {
    expect(apply(toggleBlockquote, 'quoted\n', 0)).toBe('> quoted\n')
  })

  it('does not touch lines outside the selection', () => {
    expect(apply(toggleBulletList, 'first\nsecond\nthird', 6, 12)).toBe('first\n- second\nthird')
  })
})

describe('code blocks', () => {
  it('fences the selected lines', () => {
    expect(apply(toggleCodeBlock, 'one\ntwo', 0, 7)).toBe('```\none\ntwo\n```')
  })

  it('takes the fence away again', () => {
    expect(apply(toggleCodeBlock, '```\none\ntwo\n```', 0, 15)).toBe('one\ntwo')
  })
})
