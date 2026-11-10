export type WindowAction = 'minimize' | 'toggle-maximize' | 'close'

export type WindowState = {
  translucent: boolean
  maximized: boolean
  /** Native backdrop keeps the system window controls. */
  backdrop?: 'acrylic'
}

export const windowChannels = {
  state: 'window:state',
  execute: 'window:execute',
  changed: 'window:changed'
} as const

export interface WindowControlsPort {
  getState(): Promise<WindowState>
  execute(action: WindowAction): Promise<WindowState>
  onChanged(listener: (state: WindowState) => void): () => void
}
