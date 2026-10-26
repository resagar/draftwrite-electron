/* eslint-disable react-refresh/only-export-components -- the provider and the hooks that read it belong together */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type JSX,
  type ReactNode
} from 'react'

/**
 * The Target of the Article draft, projected to the panes that read it.
 *
 * `save` is the only writer: it updates the draft in `ArticleEditor`, which is
 * the single source of truth. The panel never keeps a copy after saving.
 */
export type ArticleTargetLink = {
  /** ID of the Article being edited; empty while it is still a draft. */
  articleId: string
  value: string
  save: (next: string) => void
}

type ArticleTargetContextValue = {
  link: ArticleTargetLink | null
  publish: (next: ArticleTargetLink | null) => void
}

const ArticleTargetContext = createContext<ArticleTargetContextValue | null>(null)

/**
 * Local to the Article branch of the workspace: the Target only exists while
 * an Article editor is mounted, and there is never more than one.
 */
export function ArticleTargetProvider({ children }: { children: ReactNode }): JSX.Element {
  const [link, setLink] = useState<ArticleTargetLink | null>(null)
  const publish = useCallback((next: ArticleTargetLink | null) => setLink(next), [])
  const value = useMemo(() => ({ link, publish }), [link, publish])

  return <ArticleTargetContext.Provider value={value}>{children}</ArticleTargetContext.Provider>
}

export function useArticleTarget(): ArticleTargetLink | null {
  const value = useContext(ArticleTargetContext)

  if (value === null) {
    throw new Error('useArticleTarget requires an ArticleTargetProvider')
  }

  return value.link
}

export function usePublishArticleTarget(): (next: ArticleTargetLink | null) => void {
  const value = useContext(ArticleTargetContext)

  if (value === null) {
    throw new Error('usePublishArticleTarget requires an ArticleTargetProvider')
  }

  return value.publish
}
