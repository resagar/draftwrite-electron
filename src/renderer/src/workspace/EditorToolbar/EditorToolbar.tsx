import type { EditorView } from '@codemirror/view'
import type { StateCommand } from '@codemirror/state'
import {
  Bold,
  Code,
  Heading,
  Italic,
  Link2,
  List,
  Quote,
  SquareCheck,
  SquareCode
} from 'lucide-react'
import type { ComponentType, JSX } from 'react'
import { IconButton } from '../../ui/IconButton/IconButton'
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
} from '../../editor/commands'

type Action = {
  label: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  command: StateCommand
}

const ACTIONS: Action[] = [
  { label: 'Bold', icon: Bold, command: toggleBold },
  { label: 'Italic', icon: Italic, command: toggleItalic },
  { label: 'Heading', icon: Heading, command: toggleHeading },
  { label: 'Link', icon: Link2, command: insertLink },
  { label: 'Blockquote', icon: Quote, command: toggleBlockquote },
  { label: 'Inline code', icon: Code, command: toggleInlineCode },
  { label: 'Code block', icon: SquareCode, command: toggleCodeBlock },
  { label: 'Bulleted list', icon: List, command: toggleBulletList },
  { label: 'Task checkbox', icon: SquareCheck, command: toggleTaskList }
]

type EditorToolbarProps = {
  view: EditorView | null
}

export function EditorToolbar({ view }: EditorToolbarProps): JSX.Element {
  return (
    <div
      role="group"
      aria-label="Formatting"
      className="flex h-8 min-h-8 items-center gap-1 border-b border-base-300 px-4"
    >
      {ACTIONS.map(({ label, icon: Icon, command }) => (
        <IconButton
          key={label}
          label={label}
          disabled={view === null}
          onClick={() => {
            if (view !== null) {
              command(view)
            }
          }}
        >
          <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        </IconButton>
      ))}
    </div>
  )
}
