import { useSyncExternalStore } from 'react'

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'incomplete'

/** How the caret moved: typed/keyed, or settled at the end of a pointer gesture. */
export type CursorOrigin = 'keyboard' | 'pointer'

export type EditorCursor = {
  line: number
  column: number
  origin: CursorOrigin
}

export type EditorStatus = {
  save: SaveStatus
  words: number
  characters: number
  readingMinutes: number
  /** Caret last published by the editor, for the status bar. */
  cursor: EditorCursor | null
}

const EMPTY: EditorStatus = {
  save: 'idle',
  words: 0,
  characters: 0,
  readingMinutes: 0,
  cursor: null
}

let snapshot: EditorStatus = EMPTY
let unsavedDraft = false
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function publishStatus(patch: Partial<EditorStatus>): void {
  snapshot = { ...snapshot, ...patch }
  emit()
}

// The editor publishes whether it holds changes that are not persisted yet, so
// the navigation guard can read it without going through React.
export function publishUnsavedDraft(unsaved: boolean): void {
  if (unsavedDraft === unsaved) {
    return
  }

  unsavedDraft = unsaved
}

export function hasUnsavedDraft(): boolean {
  return unsavedDraft
}

export function resetStatus(): void {
  snapshot = EMPTY
  unsavedDraft = false
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): EditorStatus {
  return snapshot
}

export function useEditorStatus(): EditorStatus {
  return useSyncExternalStore(subscribe, getSnapshot)
}
