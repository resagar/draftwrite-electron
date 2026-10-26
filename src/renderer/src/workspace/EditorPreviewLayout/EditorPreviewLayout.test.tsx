import { beforeEach, describe, expect, it } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'
import type { JSX } from 'react'
import { WorkspaceProvider, useWorkspaceDispatch } from '../../state/workspace-context'
import { EditorPreviewLayout } from './EditorPreviewLayout'

function ModeButtons(): JSX.Element {
  const dispatch = useWorkspaceDispatch()

  return (
    <div>
      <button type="button" onClick={() => dispatch({ type: 'viewMode/select', viewMode: 'edit' })}>
        Edit
      </button>
      <button
        type="button"
        onClick={() => dispatch({ type: 'viewMode/select', viewMode: 'split' })}
      >
        Split
      </button>
      <button
        type="button"
        onClick={() => dispatch({ type: 'viewMode/select', viewMode: 'preview' })}
      >
        Preview
      </button>
    </div>
  )
}

function Harness(): JSX.Element {
  return (
    <WorkspaceProvider>
      <ModeButtons />
      <EditorPreviewLayout
        toolbar={<div>toolbar</div>}
        editor={<div>editor</div>}
        markdown={'# Calm'}
        view={null}
      />
    </WorkspaceProvider>
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('EditorPreviewLayout resizing', () => {
  it('shows the split separator only in split mode and resizes from the keyboard', () => {
    render(<Harness />)

    const separator = screen.getByRole('separator', { name: 'Resize editor and preview' })
    const editorPane = separator.previousElementSibling as HTMLElement

    expect(editorPane.style.flexBasis).toBe('50%')
    expect(separator.getAttribute('aria-valuenow')).toBe('50')

    fireEvent.keyDown(separator, { key: 'ArrowRight' })

    expect(separator.getAttribute('aria-valuenow')).toBe('52')
    expect(editorPane.style.flexBasis).toBe('52%')
    expect(window.localStorage.getItem('draftwrite.panel.editorSplit')).toBe('0.52')
  })

  it('removes the separator in edit and preview modes', () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.queryByRole('separator', { name: 'Resize editor and preview' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Preview' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Split' }))
    expect(screen.getByRole('separator', { name: 'Resize editor and preview' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(screen.queryByRole('separator', { name: 'Resize editor and preview' })).toBeNull()
    expect(screen.getByRole('region', { name: 'Preview' })).toBeTruthy()
  })
})
