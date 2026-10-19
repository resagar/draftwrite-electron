import { useState } from 'react'
import type { JSX } from 'react'
import { ArticleList } from './list/ArticleList/ArticleList'
import { StoryList } from './list/StoryList/StoryList'
import { Sidebar } from './sidebar/Sidebar/Sidebar'
import { AppShell } from './shell/AppShell/AppShell'
import { describeError } from './data/errors'
import { useDataPort } from './data/port-context'
import { LibraryProvider, useLibrary } from './state/library-context'
import { requestSave } from './state/save-registry'
import { useWorkspaceNavigation } from './state/use-navigation'
import { useShortcuts } from './state/use-shortcuts'
import { WorkspaceProvider, useWorkspace, useWorkspaceDispatch } from './state/workspace-context'
import { ConfirmDialog } from './ui/ConfirmDialog/ConfirmDialog'
import { Workspace } from './workspace/Workspace/Workspace'

function AppLayout(): JSX.Element {
  const port = useDataPort()
  const { library, dialog, pendingNavigation, selectedArticleId, selectedStoryId } = useWorkspace()
  const { articleById, storyById, reloadStories, reloadArticles } = useLibrary()
  const dispatch = useWorkspaceDispatch()
  const navigate = useWorkspaceNavigation()
  const [dialogError, setDialogError] = useState<string | null>(null)

  const selectedArticle = articleById(selectedArticleId)
  const openStory =
    selectedArticle === null ? storyById(selectedStoryId) : storyById(selectedArticle.StoryID)

  const closeDialog = (): void => {
    setDialogError(null)
    dispatch({ type: 'dialog/close' })
  }

  useShortcuts({
    onNewStory: () => navigate({ type: 'create/start', kind: 'story' }),
    onSave: () => void requestSave()
  })

  const afterWrite = (): void => {
    reloadStories()
    reloadArticles()
    closeDialog()
  }

  const failed = (caught: unknown): void => {
    setDialogError(describeError(caught))
    reloadStories()
    reloadArticles()
  }

  return (
    <>
      <AppShell
        sidebar={<Sidebar />}
        list={library === 'stories' ? <StoryList /> : <ArticleList />}
        workspace={<Workspace />}
      />

      {pendingNavigation === null ? null : (
        <ConfirmDialog
          title="Leave without saving?"
          message="This draft has changes that are not saved yet, because it is missing a required field. Leaving now discards them."
          confirmLabel="Discard and leave"
          onCancel={() => dispatch({ type: 'pending/clear' })}
          onConfirm={() => {
            const deferred = pendingNavigation
            dispatch({ type: 'pending/clear' })
            dispatch(deferred)
          }}
        />
      )}

      {dialog === 'delete-article' && selectedArticle !== null ? (
        <ConfirmDialog
          title="Delete article"
          message={`Delete “${selectedArticle.Title}”? This cannot be undone.`}
          confirmLabel="Delete article"
          error={dialogError}
          onCancel={closeDialog}
          onConfirm={() => {
            setDialogError(null)
            void port
              .deleteArticle(selectedArticle.ID)
              .then(() => {
                dispatch({ type: 'article/select', articleId: null })
                afterWrite()
              })
              .catch(failed)
          }}
        />
      ) : null}

      {dialog === 'delete-story' && openStory !== null ? (
        <ConfirmDialog
          title="Delete story"
          message={`Delete “${openStory.Topic}” and every article written from it? This cannot be undone.`}
          confirmLabel="Delete story"
          error={dialogError}
          onCancel={closeDialog}
          onConfirm={() => {
            setDialogError(null)
            void port
              .deleteStory(openStory.ID)
              .then(() => {
                dispatch({ type: 'article/select', articleId: null })
                dispatch({ type: 'story/select', storyId: null })
                afterWrite()
              })
              .catch(failed)
          }}
        />
      ) : null}
    </>
  )
}

const App = (): JSX.Element => (
  <WorkspaceProvider>
    <LibraryProvider>
      <AppLayout />
    </LibraryProvider>
  </WorkspaceProvider>
)

export default App
