import { EditorSelection, type StateCommand } from '@codemirror/state'

export function wrapOrUnwrap(marker: string, placeholder: string): StateCommand {
  return ({ state, dispatch }) => {
    const changes = state.changeByRange((range) => {
      const { from, to } = range
      const opening = state.sliceDoc(Math.max(0, from - marker.length), from)
      const closing = state.sliceDoc(to, to + marker.length)

      if (opening === marker && closing === marker) {
        return {
          changes: [
            { from: from - marker.length, to: from },
            { from: to, to: to + marker.length }
          ],
          range: EditorSelection.range(from - marker.length, to - marker.length)
        }
      }

      const selected = state.sliceDoc(from, to)
      const inner = selected === '' ? placeholder : selected

      return {
        changes: { from, to, insert: `${marker}${inner}${marker}` },
        range: EditorSelection.range(from + marker.length, from + marker.length + inner.length)
      }
    })

    dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input' }))

    return true
  }
}

export function toggleLinePrefix(prefix: string): StateCommand {
  return ({ state, dispatch }) => {
    const { from, to } = state.selection.main
    const firstLine = state.doc.lineAt(from).number
    const lastLine = state.doc.lineAt(to).number
    const changes: Array<{ from: number; to?: number; insert?: string }> = []
    let prefixed = true

    for (let number = firstLine; number <= lastLine; number += 1) {
      if (!state.doc.line(number).text.startsWith(prefix)) {
        prefixed = false
        break
      }
    }

    for (let number = firstLine; number <= lastLine; number += 1) {
      const line = state.doc.line(number)

      changes.push(
        prefixed
          ? { from: line.from, to: line.from + prefix.length }
          : { from: line.from, insert: prefix }
      )
    }

    dispatch(state.update({ changes, scrollIntoView: true, userEvent: 'input' }))

    return true
  }
}

export const toggleBold = wrapOrUnwrap('**', 'bold text')

export const toggleItalic = wrapOrUnwrap('*', 'italic text')

export const toggleInlineCode = wrapOrUnwrap('`', 'code')

export const insertLink: StateCommand = ({ state, dispatch }) => {
  const { from, to } = state.selection.main
  const selected = state.sliceDoc(from, to)
  const insert = `[${selected}](https://)`
  const urlStart = from + selected.length + 3

  dispatch(
    state.update({
      changes: { from, to, insert },
      selection: EditorSelection.range(urlStart, urlStart + 'https://'.length),
      scrollIntoView: true,
      userEvent: 'input'
    })
  )

  return true
}

export const toggleCodeBlock: StateCommand = ({ state, dispatch }) => {
  const { from, to } = state.selection.main
  const first = state.doc.lineAt(from)
  const last = state.doc.lineAt(to)
  const fenced = first.text.startsWith('```') && last.text.trim() === '```'

  if (fenced) {
    dispatch(
      state.update({
        changes: [
          { from: first.from, to: first.to + 1 },
          { from: last.from - 1, to: last.to }
        ],
        scrollIntoView: true,
        userEvent: 'input'
      })
    )

    return true
  }

  dispatch(
    state.update({
      changes: [
        { from: first.from, insert: '```\n' },
        { from: last.to, insert: '\n```' }
      ],
      scrollIntoView: true,
      userEvent: 'input'
    })
  )

  return true
}

export const toggleHeading = toggleLinePrefix('## ')

export const toggleBlockquote = toggleLinePrefix('> ')

export const toggleBulletList = toggleLinePrefix('- ')

export const toggleTaskList = toggleLinePrefix('- [ ] ')
