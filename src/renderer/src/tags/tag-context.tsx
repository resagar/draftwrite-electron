/* eslint-disable react-refresh/only-export-components -- tag state and its consumers share a context */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode
} from 'react'
import { createPortal } from 'react-dom'
import type { TagColor } from '../../../shared/tags'
import { useDataPort } from '../data/port-context'
import { useTagMutations } from '../state/tag-mutation-context'
import { useWorkspace, useWorkspaceDispatch } from '../state/workspace-context'
import { TagMenu } from './TagMenu'
import { TagDialog } from './TagDialog'

type MenuRequest = { name: string; x: number; y: number; anchor: HTMLElement }
type TagContext = {
  colors: Record<string, TagColor>
  openMenu: (request: MenuRequest) => void
}
const Context = createContext<TagContext>({ colors: {}, openMenu: () => {} })
export const useTags = (): TagContext => useContext(Context)

export function TagsProvider({ children }: { children: ReactNode }): JSX.Element {
  const port = useDataPort()
  const mutations = useTagMutations()
  const { tagFilter } = useWorkspace()
  const dispatch = useWorkspaceDispatch()
  const metadataRevision = useRef(0)
  const [colors, setColors] = useState<Record<string, TagColor>>({})
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [menu, setMenu] = useState<MenuRequest | null>(null)
  const [dialog, setDialog] = useState<{
    request: MenuRequest
    mode: 'settings' | 'delete'
  } | null>(null)

  useEffect(() => {
    let active = true
    const revision = metadataRevision.current
    void port
      .listTagMetadata()
      .then((tags) => {
        if (active && revision === metadataRevision.current)
          setColors(Object.fromEntries(tags.map(({ name, color }) => [name, color])))
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
    return () => {
      active = false
    }
  }, [port, attempt])

  const restoreFocus = (request: MenuRequest): void => {
    if (request.anchor.isConnected) request.anchor.focus()
    else {
      document
        .querySelector<HTMLElement>('section[aria-label$=" editor"] input, aside button')
        ?.focus()
    }
  }
  const closeMenu = (): void => {
    if (menu) restoreFocus(menu)
    setMenu(null)
  }
  const closeDialog = (): void => {
    if (dialog) {
      restoreFocus(dialog.request)
      const request = dialog.request
      requestAnimationFrame(() => restoreFocus(request))
    }
    setDialog(null)
  }

  return (
    <Context.Provider value={{ colors, openMenu: setMenu }}>
      {children}
      {loadError ? (
        <div role="alert" className="fixed bottom-8 left-3 z-50 rounded bg-base-200 p-2 text-xs">
          Tag colors could not be loaded.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => {
              setLoadError(false)
              setAttempt((v) => v + 1)
            }}
          >
            Retry
          </button>
        </div>
      ) : null}
      {menu
        ? createPortal(
            <TagMenu
              request={menu}
              onClose={closeMenu}
              onSettings={() => {
                setDialog({ request: menu, mode: 'settings' })
                setMenu(null)
              }}
              onDelete={() => {
                setDialog({ request: menu, mode: 'delete' })
                setMenu(null)
              }}
              onFilter={() => {
                dispatch({ type: 'filter/tag', tag: menu.name })
                closeMenu()
              }}
            />,
            document.body
          )
        : null}
      {dialog
        ? createPortal(
            <TagDialog
              key={`${dialog.mode}:${dialog.request.name}`}
              name={dialog.request.name}
              mode={dialog.mode}
              color={
                Object.hasOwn(colors, dialog.request.name) ? colors[dialog.request.name] : 'default'
              }
              onClose={closeDialog}
              onSave={async (color) => {
                await port.setTagColor(dialog.request.name, color)
                metadataRevision.current += 1
                setColors((current) => ({ ...current, [dialog.request.name]: color }))
              }}
              onDelete={async () => {
                const name = dialog.request.name
                await mutations.delete(name, () => port.deleteTagEverywhere(name))
                metadataRevision.current += 1
                setColors((current) => {
                  const next = { ...current }
                  delete next[name]
                  return next
                })
                if (tagFilter === name) dispatch({ type: 'filter/tag', tag: null })
              }}
            />,
            document.body
          )
        : null}
    </Context.Provider>
  )
}
