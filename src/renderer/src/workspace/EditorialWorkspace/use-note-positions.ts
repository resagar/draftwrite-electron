import { useEffect, useRef, useState } from 'react'
import type { EditorView } from '@codemirror/view'
import type { ReviewNote } from '../../../../shared/editorial'
import type { PanelAnchor } from './FloatingPanel'

export function useNotePositions(
  view: EditorView | null,
  notes: ReviewNote[],
  range: { from: number; to: number } | null,
  onAnnotate: () => void
): {
  markers: { id: string; top: number; left: number }[]
  selection: (PanelAnchor & { from: number; to: number }) | null
  anchor: PanelAnchor | undefined
} {
  const [markers, setMarkers] = useState<{ id: string; top: number; left: number }[]>([])
  const [selection, setSelection] = useState<(PanelAnchor & { from: number; to: number }) | null>(
    null
  )
  const [anchor, setMeasuredAnchor] = useState<PanelAnchor | undefined>()
  const openRef = useRef(onAnnotate)
  useEffect(() => {
    openRef.current = onAnnotate
  })
  useEffect(() => {
    if (!view) return
    const measure = (): void => {
      view.requestMeasure({
        key: view,
        read: () => {
          const box = view.scrollDOM.getBoundingClientRect()
          const selected = view.state.selection.main
          const rect = selected.empty ? null : view.coordsAtPos(selected.to)
          const noteRect =
            range && range.to <= view.state.doc.length ? view.coordsAtPos(range.to) : null
          return {
            noteRect,
            markers: notes
              .filter((n) => n.anchor && !n.anchor.detached && !n.resolved)
              .flatMap((n) => {
                const pos = n.anchor!.from
                if (pos > view.state.doc.length) return []
                const coords = view.coordsAtPos(pos)
                return coords && coords.top >= box.top && coords.bottom <= box.bottom
                  ? [{ id: n.id, top: coords.top, left: Math.max(box.left, box.right - 28) }]
                  : []
              }),
            selection:
              rect && rect.top >= box.top && rect.bottom <= box.bottom
                ? {
                    left: rect.left,
                    top: rect.top,
                    bottom: rect.bottom,
                    from: selected.from,
                    to: selected.to
                  }
                : null
          }
        },
        write: (result) => {
          setMarkers(result.markers)
          setSelection(result.selection)
          if (result.noteRect)
            setMeasuredAnchor({
              left: result.noteRect.left,
              top: result.noteRect.top,
              bottom: result.noteRect.bottom
            })
        }
      })
    }
    const shortcut = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault()
        openRef.current()
      }
    }
    measure()
    view.dom.addEventListener('mouseup', measure)
    view.dom.addEventListener('keyup', measure)
    view.dom.addEventListener('keydown', shortcut)
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      view.dom.removeEventListener('mouseup', measure)
      view.dom.removeEventListener('keyup', measure)
      view.dom.removeEventListener('keydown', shortcut)
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [view, notes, range])
  return {
    markers: view ? markers : [],
    selection: view ? selection : null,
    anchor: view && range ? anchor : undefined
  }
}
