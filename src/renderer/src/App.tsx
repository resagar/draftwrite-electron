import { useState } from 'react'
import type { JSX } from 'react'
import { ArticleList } from './list/ArticleList/ArticleList'
import { PostList } from './list/PostList/PostList'
import { StoryList } from './list/StoryList/StoryList'
import { Sidebar } from './sidebar/Sidebar/Sidebar'
import { AppShell } from './shell/AppShell/AppShell'
import { describeError } from './data/errors'
import { useDataPort } from './data/port-context'
import { LibraryProvider, useLibrary } from './state/library-context'
import { requestSave } from './state/save-registry'
import { useContextualCreate } from './state/use-contextual-create'
import { useShortcuts } from './state/use-shortcuts'
import { WorkspaceProvider, useWorkspace, useWorkspaceDispatch } from './state/workspace-context'
import { ConfirmDialog } from './ui/ConfirmDialog/ConfirmDialog'
import { Workspace } from './workspace/Workspace/Workspace'

function AppLayout(): JSX.Element {
  const port = useDataPort()
  const { library, dialog, pendingNavigation, selectedArticleId, selectedStoryId } = useWorkspace()
  const { articleById, storyById, postById, reloadStories, reloadArticles, reloadPosts } =
    useLibrary()
  const dispatch = useWorkspaceDispatch()
  const [dialogError, setDialogError] = useState<string | null>(null)

  const selectedArticle = articleById(selectedArticleId)
  const dialogStory = dialog?.kind === 'delete-story' ? storyById(dialog.storyId) : null
  const dialogArticle = dialog?.kind === 'delete-article' ? articleById(dialog.articleId) : null
  const dialogPost = dialog?.kind === 'delete-post' ? postById(dialog.postId) : null

  const closeDialog = (): void => {
    setDialogError(null)
    dispatch({ type: 'dialog/close' })
  }

  const create = useContextualCreate()

  useShortcuts({
    onNew: create.start,
    onSave: () => void requestSave(),
    onToggleZen: () => dispatch({ type: 'zen/toggle' })
  })

  const afterWrite = (): void => {
    reloadStories()
    reloadArticles()
    reloadPosts()
    closeDialog()
  }

  const failed = (caught: unknown): void => {
    setDialogError(describeError(caught))
    reloadStories()
    reloadArticles()
    reloadPosts()
  }

  return (
    <>
      <AppShell
        sidebar={<Sidebar />}
        list={
          library === 'stories' ? (
            <StoryList />
          ) : library === 'articles' ? (
            <ArticleList />
          ) : (
            <PostList />
          )
        }
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

      {dialog?.kind === 'delete-article' && dialogArticle !== null ? (
        <ConfirmDialog
          title="Delete article"
          message={`Delete “${dialogArticle.Title}”? This cannot be undone.`}
          confirmLabel="Delete article"
          error={dialogError}
          onCancel={closeDialog}
          onConfirm={() => {
            setDialogError(null)
            void port
              .deleteArticle(dialogArticle.ID)
              .then(() => {
                dispatch({ type: 'article/deleted', articleId: dialogArticle.ID })
                afterWrite()
              })
              .catch(failed)
          }}
        />
      ) : null}

      {dialog?.kind === 'delete-story' && dialogStory !== null ? (
        <ConfirmDialog
          title="Delete story"
          message={`Delete “${dialogStory.Topic}” and every article written from it? This cannot be undone.`}
          confirmLabel="Delete story"
          error={dialogError}
          onCancel={closeDialog}
          onConfirm={() => {
            setDialogError(null)
            void port
              .deleteStory(dialogStory.ID)
              .then(() => {
                if (selectedArticle !== null && selectedArticle.StoryID === dialogStory.ID) {
                  dispatch({ type: 'article/select', articleId: null })
                }
                if (selectedStoryId === dialogStory.ID) {
                  dispatch({ type: 'story/deleted', storyId: dialogStory.ID })
                }
                afterWrite()
              })
              .catch(failed)
          }}
        />
      ) : null}

      {dialog?.kind === 'delete-post' && dialogPost !== null ? (
        <ConfirmDialog
          title="Delete post"
          message={`Delete “${dialogPost.Topic}”? This cannot be undone.`}
          confirmLabel="Delete post"
          error={dialogError}
          onCancel={closeDialog}
          onConfirm={() => {
            setDialogError(null)
            void port
              .deletePost(dialogPost.ID)
              .then(() => {
                dispatch({ type: 'post/deleted', postId: dialogPost.ID })
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
