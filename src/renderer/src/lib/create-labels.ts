import type { CreateKind } from '../state/workspace-context'

export const CREATE_LABELS: Record<CreateKind, string> = {
  story: 'New Story',
  article: 'New Article'
}
