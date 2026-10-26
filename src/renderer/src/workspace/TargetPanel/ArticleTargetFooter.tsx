import type { JSX } from 'react'
import { useArticleTarget } from '../../state/article-target-context'
import { TargetPanel } from './TargetPanel'

/**
 * Reads the target link published by the Article editor. `key` remounts the
 * panel on every Article change, so an edit in progress cannot leak into the
 * next one.
 */
export function ArticleTargetFooter(): JSX.Element | null {
  const link = useArticleTarget()

  if (link === null) {
    return null
  }

  return <TargetPanel key={link.articleId} link={link} />
}
