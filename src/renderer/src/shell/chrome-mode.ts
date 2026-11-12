import type { WindowChrome } from './TitleBar/use-window-chrome'

/**
 * The window draws its own controls over the bar in a translucent frameless
 * window. Acrylic keeps the native controls, so it is excluded.
 */
export function usesCustomWindowControls(chrome?: WindowChrome): boolean {
  return chrome?.state?.translucent === true && chrome.state.backdrop !== 'acrylic'
}

/** The window hides its native title bar behind an integrated overlay. */
export function usesIntegratedTitleBar(): boolean {
  const platform = window.electron?.process.platform
  return platform === 'win32' || platform === 'linux'
}

/**
 * A header only drags the window when there is no native title bar to drag:
 * a frameless window with custom controls or with an integrated overlay.
 */
export function isWindowDragHeader(chrome?: WindowChrome): boolean {
  return usesCustomWindowControls(chrome) || usesIntegratedTitleBar()
}
