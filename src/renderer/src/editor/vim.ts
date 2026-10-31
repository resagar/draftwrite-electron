import { Prec } from '@codemirror/state'
import { CodeMirror, Vim, vim } from '@replit/codemirror-vim'
import { requestSave } from '../state/save-registry'

function notify(cm: CodeMirror, message: string): void {
  const content = document.createElement('span')
  content.setAttribute('role', 'status')
  content.textContent = message
  cm.openNotification(content, { bottom: true })
}

// Resolve the active save handler at invocation time, never capture a document.
Vim.defineEx('write', 'w', (cm) => {
  void requestSave().catch(() => {
    if (!cm.cm6.destroyed) notify(cm, 'Could not save. Use the document controls to retry.')
  })
})

function unavailable(cm: CodeMirror): void {
  notify(cm, 'Vim close commands are not available. Use the document controls.')
}

Vim.defineEx('quit', 'q', unavailable)
Vim.defineEx('wq', 'wq', unavailable)

// Vim must see keys before the conventional editor keymaps.
export const vimEditing = Prec.highest(vim())
