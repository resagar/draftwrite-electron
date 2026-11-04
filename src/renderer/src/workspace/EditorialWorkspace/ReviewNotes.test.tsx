import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, jest } from '@jest/globals'
import { ReviewNotes } from './ReviewNotes'

it('lets archived variants expose detached notes and their original quotations without editing', async () => {
  render(
    <ReviewNotes
      notes={[
        {
          id: 'n1',
          text: 'Review this original paragraph',
          resolved: false,
          anchor: { from: 0, to: 19, quote: 'Original quotation.', detached: true },
          origin: null
        }
      ]}
      view={null}
      disabled={true}
      onSave={async () => {
        throw new Error('Read only')
      }}
      onResolve={async () => {
        throw new Error('Read only')
      }}
    />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Notes (1)' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Review this original paragraph' }))
  expect(screen.getByText('Original quotation.')).toBeTruthy()
  expect((screen.getByLabelText('Review observation') as HTMLTextAreaElement).readOnly).toBe(true)
  expect(screen.queryByRole('button', { name: 'Save note' })).toBeNull()
})

it('keeps an unfinished edit when the same note is opened again', () => {
  render(
    <ReviewNotes
      notes={[
        { id: 'n1', text: 'Original observation', resolved: false, anchor: null, origin: null }
      ]}
      view={null}
      disabled={false}
      onSave={async () => {}}
      onResolve={async () => {}}
    />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Notes (1)' }))
  fireEvent.click(screen.getByRole('button', { name: 'Original observation' }))
  fireEvent.change(screen.getByLabelText('Review observation'), {
    target: { value: 'Unfinished revision' }
  })
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  fireEvent.click(screen.getByRole('button', { name: 'Original observation' }))
  expect((screen.getByLabelText('Review observation') as HTMLTextAreaElement).value).toBe(
    'Unfinished revision'
  )
})

it('opens a nonmodal note, preserves its unfinished text on Escape, and saves explicitly', async () => {
  const save = jest
    .fn<
      (id: string | null, text: string, range: { from: number; to: number } | null) => Promise<void>
    >()
    .mockResolvedValue(undefined)
  render(
    <ReviewNotes notes={[]} view={null} disabled={false} onSave={save} onResolve={async () => {}} />
  )
  const trigger = screen.getByRole('button', { name: 'Add general note' })
  fireEvent.click(trigger)
  const dialog = screen.getByRole('dialog', { name: 'Review note' })
  expect(dialog.getAttribute('aria-modal')).toBe('false')
  fireEvent.change(screen.getByLabelText('Review observation'), {
    target: { value: 'The opening needs evidence.' }
  })
  fireEvent.keyDown(dialog, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(trigger)
  expect((screen.getByLabelText('Review observation') as HTMLTextAreaElement).value).toBe(
    'The opening needs evidence.'
  )
  fireEvent.click(screen.getByRole('button', { name: 'Save note' }))
  await waitFor(() => expect(save).toHaveBeenCalledWith(null, 'The opening needs evidence.', null))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})

it('keeps failed note edits visible for retry', async () => {
  render(
    <ReviewNotes
      notes={[]}
      view={null}
      disabled={false}
      onSave={async () => {
        throw new Error('Disk full')
      }}
      onResolve={async () => {}}
    />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Add general note' }))
  fireEvent.change(screen.getByLabelText('Review observation'), {
    target: { value: 'Keep this observation' }
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save note' }))
  await screen.findByText('Disk full')
  expect((screen.getByLabelText('Review observation') as HTMLTextAreaElement).value).toBe(
    'Keep this observation'
  )
})
