import type { ElectronAPI } from '@electron-toolkit/preload'
import type { DraftwriteApi } from '../../adapters/ipc/contract'

declare global {
  interface Window {
    electron: ElectronAPI
    draftwrite: DraftwriteApi
  }
}
